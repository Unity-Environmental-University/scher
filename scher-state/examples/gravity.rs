//! ╔══════════════════════════════════════════════════════════════════════════╗
//! ║  MUSLIN — seams showing on purpose. Tear this apart before trusting it.  ║
//! ╚══════════════════════════════════════════════════════════════════════════╝
//!
//! GRAVITY DEMO, v2 (Hallie's catch, 2026-07-21: "CHAIN FENCE HIT — well of
//! course, we're looping. Chain fence ain't covering that."):
//!
//! v1 laid 6 state events per tick — chain-as-trace of a LOOP, which is
//! exactly the shape the library's own loop ruling forbids (the sublime
//! prehends itself; passes are READ-side, the chain does not grow — see
//! loop_doll_one_event_many_passes: one row, N passes). The chain fence
//! fired because the demo was modeling a loop wrongly, not because chains
//! need to be that long. v2 obeys the law:
//!
//!   THE CHAIN IS CONSTANT: 12 seed state events (REAL-typed positions and
//!   velocities — the typed-value experiment, working) + ONE circular
//!   "advance" event. 13 rows, forever. Passes exist only in the read:
//!   each /state poll forces more passes (the read forces the tick,
//!   scher-time's law), advancing a PASS CACHE — the raster-from-raster
//!   blessing ("the raster can calculate from the raster while the cache
//!   remains valid"), applied to the loop's passes.
//!
//! Run:  cargo run --example gravity      (from scher/scher-state/)
//! Then: open http://127.0.0.1:8047      (fresh port; :8014/:8015 untouched)
//!
//! SEAMS (this demo's own, on top of the library's):
//!   • the circular event's content is DESCRIPTIVE — the fold's action
//!     grammar is integer-only (no-drift seam held), so the orbit step is
//!     host-interpreted. The event names the loop; the host is its
//!     interpreter. A real landing wants REAL arithmetic ops — unruled.
//!   • initial conditions are READ FROM THE RASTER at pass 0 (the seeds are
//!     honestly state); after that, positions live in the pass cache, not
//!     the raster. Pixels = seed-raster ∘ read-side passes. Confessed:
//!     weaker than v1's every-frame raster read — and LAWFUL where v1 wasn't.
//!   • no chain fence anymore — nothing grows. The guard here is the pass
//!     BUDGET for the session (PASS_BUDGET), refused loudly in the payload
//!     when a read would demand more.
//!   • SSE, not polling (Hallie, mid-build: "if we're not using websockets
//!     or SSEs for this.."): /events is a server-sent EVENT stream — the
//!     subscription is a STANDING READ; holding it open is what forces the
//!     passes, frame by frame ("the read forces the tick", held rather than
//!     repeated). Close every tab and time stops. WebSockets refused:
//!     nothing here needs the client to talk back. (v2.1: the first cut was
//!     single-threaded and ONE subscriber held the only thread — Hallie's
//!     page loaded forever while the builder's own verification tab hogged
//!     the stream. Now: thread per connection, sim behind a mutex. SEAM:
//!     every standing read forces passes, so two subscribers make time run
//!     twice as fast — shared-clock semantics deliberately unruled.)

use rusqlite::types::Value;
use scher_state::StateStore;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::time::Instant;

const PORT: u16 = 8047;
const G: f64 = 2000.0;
const DT: f64 = 0.02;
const SUBSTEPS: usize = 4;
const PASS_BUDGET: u64 = 1_000_000; // total passes a session may demand

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
    let masses = [40.0, 1.0, 1.0];
    // THE WHOLE CHAIN, laid once: 12 REAL seeds + 1 circular event = 13 rows.
    let seeds: [(f64, f64, f64, f64); 3] = [
        (300.0, 300.0, 0.0, 0.0),
        (300.0, 140.0, 22.0, 0.0),
        (300.0, 480.0, -17.0, 0.0),
    ];
    for (i, (x, y, vx, vy)) in seeds.iter().enumerate() {
        store.lay_state(&format!("seed-b{i}x"), &format!("b{i}.x"), Value::Real(*x)).unwrap();
        store.lay_state(&format!("seed-b{i}y"), &format!("b{i}.y"), Value::Real(*y)).unwrap();
        store.lay_state(&format!("seed-b{i}vx"), &format!("b{i}.vx"), Value::Real(*vx)).unwrap();
        store.lay_state(&format!("seed-b{i}vy"), &format!("b{i}.vy"), Value::Real(*vy)).unwrap();
    }
    // ONE circular event. Its content is descriptive (the fold's grammar is
    // integer-only, no-drift): the host interprets it; passes are read-side.
    store
        .lay_action(
            "advance",
            "orbit-step: sublime prehends itself; passes ingress on read, host-interpreted (REAL grammar unruled)",
        )
        .unwrap();

    // pass 0: initial conditions come OUT OF THE RASTER — the seeds are state,
    // and if a REAL comes back as anything else the typed-value claim broke.
    let raster = store.rasterize().unwrap();
    let real = |k: &str| match raster.get(k) {
        Some(Value::Real(v)) => *v,
        other => panic!("raster lost the REAL for {k}: {other:?}"),
    };
    let mut bodies: Vec<Body> = (0..3)
        .map(|i| Body {
            x: real(&format!("b{i}.x")),
            y: real(&format!("b{i}.y")),
            vx: real(&format!("b{i}.vx")),
            vy: real(&format!("b{i}.vy")),
            m: masses[i],
        })
        .collect();
    let chain_len = store.chain_oldest_to_newest().unwrap().len();

    // the pass cache, shared: every standing read forces passes through here
    struct Sim {
        bodies: Vec<Body>,
        pass: u64,
        budget_refused: bool,
    }
    let sim = std::sync::Arc::new(std::sync::Mutex::new(Sim {
        bodies: std::mem::take(&mut bodies),
        pass: 0,
        budget_refused: false,
    }));

    let listener = TcpListener::bind(("127.0.0.1", PORT))
        .unwrap_or_else(|e| panic!("port {PORT} refused ({e}) — pick another fresh port, never :8014/:8015"));
    println!("MUSLIN gravity v2.1 on http://127.0.0.1:{PORT}  (chain is {chain_len} rows, forever; passes are read-side; thread per subscriber)");

    for stream in listener.incoming() {
        let Ok(mut stream) = stream else { continue };
        let sim = sim.clone();
        // thread per connection: no subscriber can starve another's load
        std::thread::spawn(move || {
            let mut buf = [0u8; 2048];
            let n = stream.read(&mut buf).unwrap_or(0);
            let req = String::from_utf8_lossy(&buf[..n]);
            let path = req.split_whitespace().nth(1).unwrap_or("/").to_string();

            if path == "/events" {
                // THE STANDING READ: while this subscription is held open, it
                // forces SUBSTEPS more ingressions of the one circular event
                // per frame. The chain lays NOTHING. Client gone → write
                // fails → this read ends; time stops when the last one does.
                let _ = write!(
                    stream,
                    "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nCache-Control: no-cache\r\nConnection: keep-alive\r\n\r\n"
                );
                loop {
                    let frame = {
                        let mut s = sim.lock().expect("sim mutex");
                        let t0 = Instant::now();
                        if s.pass + SUBSTEPS as u64 > PASS_BUDGET {
                            s.budget_refused = true; // loud, never silent
                        } else {
                            for _ in 0..SUBSTEPS {
                                step(&mut s.bodies);
                            }
                            s.pass += SUBSTEPS as u64;
                        }
                        let advance_ms = t0.elapsed().as_secs_f64() * 1000.0;
                        let mut coords = String::new();
                        for (i, b) in s.bodies.iter().enumerate() {
                            if i > 0 {
                                coords.push(',');
                            }
                            coords.push_str(&format!("{{\"x\":{:.2},\"y\":{:.2}}}", b.x, b.y));
                        }
                        format!(
                            "data: {{\"pass\":{},\"chain\":{chain_len},\"advance_ms\":{advance_ms:.3},\"refused\":{},\"bodies\":[{coords}]}}\n\n",
                            s.pass, s.budget_refused
                        )
                    }; // lock released before the write/sleep — readers share time, not the lock
                    if stream.write_all(frame.as_bytes()).is_err() || stream.flush().is_err() {
                        break; // subscriber let go; this standing read ends
                    }
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
                return;
            }
            let body = PAGE;
            let _ = write!(
                stream,
                "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            );
        });
    }
}

const PAGE: &str = r#"<!doctype html><meta charset="utf-8">
<title>MUSLIN: gravity, one circular event</title>
<style>
 body{background:#111;color:#ddd;font:14px/1.4 monospace;margin:0}
 #banner{background:repeating-linear-gradient(45deg,#552,#552 12px,#331 12px,#331 24px);
   color:#fd6;padding:6px 12px;font-weight:bold}
 #hud{padding:6px 12px;color:#8ac}
 #refused{color:#f66;font-weight:bold;display:none}
 canvas{display:block;margin:8px auto;background:#000;border:1px dashed #444}
</style>
<div id=banner>MUSLIN v2 — chain CONSTANT (12 seeds + 1 circular event); passes are read-side via an SSE STANDING READ: the held subscription forces the ticks. Seams showing on purpose.</div>
<div id=hud>chain <span id=c>0</span> rows (forever) · pass <span id=p>0</span> · advance <span id=a>0</span> ms
 <span id=refused> · PASS BUDGET REFUSED LOUDLY — the standing read demanded more passes than the session's budget</span></div>
<canvas id=cv width=600 height=600></canvas>
<script>
const ctx = cv.getContext('2d');
const trails = [[],[],[]];
const es = new EventSource('/events'); // the standing read — holding it open IS the tick
es.onmessage = (m) => {
  const s = JSON.parse(m.data);
  p.textContent = s.pass; c.textContent = s.chain; a.textContent = s.advance_ms;
  document.getElementById('refused').style.display = s.refused ? 'inline' : 'none';
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(0,0,600,600);
  const colors = ['#fd6','#6cf','#f9a'];
  s.bodies.forEach((b,i)=>{
    trails[i].push([b.x,b.y]); if(trails[i].length>200) trails[i].shift();
    ctx.strokeStyle = colors[i]+'5'; ctx.beginPath();
    trails[i].forEach(([x,y],k)=> k? ctx.lineTo(x,y): ctx.moveTo(x,y)); ctx.stroke();
    ctx.fillStyle = colors[i]; ctx.beginPath();
    ctx.arc(b.x, b.y, i===0?10:4, 0, 7); ctx.fill();
  });
};
// es.onerror: EventSource auto-reconnects — the read re-establishes itself
</script>"#;
