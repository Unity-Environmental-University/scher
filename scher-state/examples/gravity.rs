//! ╔══════════════════════════════════════════════════════════════════════════╗
//! ║  MUSLIN — seams showing on purpose. Tear this apart before trusting it.  ║
//! ╚══════════════════════════════════════════════════════════════════════════╝
//!
//! GRAVITY DEMO (Hallie's invitation, 2026-07-21, accepted scoped): three
//! bodies under gravity; every tick lays the positions as REAL-typed state
//! events on the succession chain, and the render client draws WHAT THE
//! RASTER SAYS — positions are read back through rasterize(), never from the
//! sim's own variables. The pixels are backed by the fold or they are wrong.
//!
//! THE READ FORCES THE TICK (scher-time's law, kept on purpose): the sim only
//! advances when the client polls /state — no thread, no clock. Stop polling
//! and time stops; the sublime waits.
//!
//! Run:  cargo run --example gravity      (from scher/scher-state/)
//! Then: open http://127.0.0.1:8047      (fresh port; :8014/:8015 untouched)
//!
//! SEAMS (this demo's own, on top of the library's):
//!   • physics is HOST-computed — chain-as-trace mode. The action grammar is
//!     integer-only and was NOT grown for this (no-drift seam held); a real
//!     in-events orbit wants REAL arithmetic ops the grammar refuses to grow
//!     by drift.
//!   • rasterize() re-walks the whole chain EVERY frame — cost is O(chain)
//!     per read and the client DISPLAYS it (chain length + raster ms). The
//!     visible slowdown is the finding, not a bug to hide.
//!   • CHAIN FENCE at 6000 laid events: laying stops LOUDLY (banner in the
//!     client), serving continues. The unruled question underneath is
//!     kalpa-shaped: when does a chain checkpoint into a fresh genesis?
//!   • hand-rolled HTTP over std TcpListener, single-threaded, no deps —
//!     muslin plumbing, not a server.

use rusqlite::types::Value;
use scher_state::StateStore;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::time::Instant;

const PORT: u16 = 8047;
const CHAIN_FENCE: usize = 6000;
const G: f64 = 2000.0;
const DT: f64 = 0.02;
const SUBSTEPS: usize = 4;

struct Body {
    x: f64,
    y: f64,
    vx: f64,
    vy: f64,
    m: f64,
}

fn step(bodies: &mut [Body]) {
    let n = bodies.len();
    let mut ax = vec![0.0; n];
    let mut ay = vec![0.0; n];
    for i in 0..n {
        for j in 0..n {
            if i == j {
                continue;
            }
            let dx = bodies[j].x - bodies[i].x;
            let dy = bodies[j].y - bodies[i].y;
            let d2 = (dx * dx + dy * dy).max(100.0); // softened, no singularities
            let f = G * bodies[j].m / (d2 * d2.sqrt());
            ax[i] += f * dx;
            ay[i] += f * dy;
        }
    }
    for i in 0..n {
        bodies[i].vx += ax[i] * DT;
        bodies[i].vy += ay[i] * DT;
        bodies[i].x += bodies[i].vx * DT;
        bodies[i].y += bodies[i].vy * DT;
    }
}

fn main() {
    let mut store = StateStore::open_in_memory().expect("in-memory store");
    // a light triple: one heavy sun, two light bodies in rough orbit
    let mut bodies = vec![
        Body { x: 300.0, y: 300.0, vx: 0.0, vy: 0.0, m: 40.0 },
        Body { x: 300.0, y: 140.0, vx: 22.0, vy: 0.0, m: 1.0 },
        Body { x: 300.0, y: 480.0, vx: -17.0, vy: 0.0, m: 1.0 },
    ];
    let mut tick: u64 = 0;
    let mut laid: usize = 0;
    let mut fence_hit = false;

    let listener = TcpListener::bind(("127.0.0.1", PORT))
        .unwrap_or_else(|e| panic!("port {PORT} refused ({e}) — pick another fresh port, never :8014/:8015"));
    println!("MUSLIN gravity on http://127.0.0.1:{PORT}  (^C to stop; the sim only ticks when polled)");

    for stream in listener.incoming() {
        let Ok(mut stream) = stream else { continue };
        let mut buf = [0u8; 2048];
        let n = stream.read(&mut buf).unwrap_or(0);
        let req = String::from_utf8_lossy(&buf[..n]);
        let path = req.split_whitespace().nth(1).unwrap_or("/").to_string();

        let (status, ctype, body) = if path == "/state" {
            // THE READ FORCES THE TICK: advance, lay, then answer FROM THE RASTER.
            if !fence_hit {
                for _ in 0..SUBSTEPS {
                    step(&mut bodies);
                }
                tick += 1;
                for (i, b) in bodies.iter().enumerate() {
                    store.lay_state(&format!("t{tick}-b{i}x"), &format!("b{i}.x"), Value::Real(b.x)).unwrap();
                    store.lay_state(&format!("t{tick}-b{i}y"), &format!("b{i}.y"), Value::Real(b.y)).unwrap();
                    laid += 2;
                }
                if laid >= CHAIN_FENCE {
                    fence_hit = true; // loud in the payload below, never silent
                }
            }
            let t0 = Instant::now();
            let raster = store.rasterize().unwrap();
            let raster_ms = t0.elapsed().as_secs_f64() * 1000.0;
            // positions come OUT OF THE RASTER — the sim vars are not consulted
            let mut coords = String::new();
            for i in 0..bodies.len() {
                let get = |k: &str| match raster.get(k) {
                    Some(Value::Real(v)) => *v,
                    other => panic!("raster lost the REAL for {k}: {other:?} — the typed-value claim just broke"),
                };
                if i > 0 {
                    coords.push(',');
                }
                coords.push_str(&format!(
                    "{{\"x\":{:.2},\"y\":{:.2}}}",
                    get(&format!("b{i}.x")),
                    get(&format!("b{i}.y"))
                ));
            }
            let json = format!(
                "{{\"tick\":{tick},\"chain\":{laid},\"raster_ms\":{raster_ms:.2},\"fence\":{fence_hit},\"bodies\":[{coords}]}}"
            );
            ("200 OK", "application/json", json)
        } else {
            ("200 OK", "text/html; charset=utf-8", PAGE.to_string())
        };
        let _ = write!(
            stream,
            "HTTP/1.1 {status}\r\nContent-Type: {ctype}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        );
    }
}

const PAGE: &str = r#"<!doctype html><meta charset="utf-8">
<title>MUSLIN: gravity from the raster</title>
<style>
 body{background:#111;color:#ddd;font:14px/1.4 monospace;margin:0}
 #banner{background:repeating-linear-gradient(45deg,#552,#552 12px,#331 12px,#331 24px);
   color:#fd6;padding:6px 12px;font-weight:bold}
 #hud{padding:6px 12px;color:#8ac}
 #fence{color:#f66;font-weight:bold;display:none}
 canvas{display:block;margin:8px auto;background:#000;border:1px dashed #444}
</style>
<div id=banner>MUSLIN — pixels drawn from the RASTER (fold over the succession chain), never from sim variables. Seams showing on purpose.</div>
<div id=hud>tick <span id=t>0</span> · chain <span id=c>0</span> events · raster <span id=r>0</span> ms
 <span id=fence> · CHAIN FENCE HIT — laying stopped LOUDLY; time is frozen, the raster still reads</span></div>
<canvas id=cv width=600 height=600></canvas>
<script>
const ctx = cv.getContext('2d');
const trails = [[],[],[]];
async function poll(){
  try{
    const s = await (await fetch('/state')).json();
    t.textContent = s.tick; c.textContent = s.chain; r.textContent = s.raster_ms;
    document.getElementById('fence').style.display = s.fence ? 'inline' : 'none';
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0,0,600,600);
    const colors = ['#fd6','#6cf','#f9a'];
    s.bodies.forEach((b,i)=>{
      trails[i].push([b.x,b.y]); if(trails[i].length>200) trails[i].shift();
      ctx.strokeStyle = colors[i]+'5'; ctx.beginPath();
      trails[i].forEach(([x,y],k)=> k? ctx.lineTo(x,y): ctx.moveTo(x,y)); ctx.stroke();
      ctx.fillStyle = colors[i]; ctx.beginPath();
      ctx.arc(b.x, b.y, i===0?10:4, 0, 7); ctx.fill();
    });
  }catch(e){ /* server gone: time stops, honestly */ }
  setTimeout(poll, 100);
}
poll();
</script>"#;
