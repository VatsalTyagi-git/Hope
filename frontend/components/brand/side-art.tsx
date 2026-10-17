/**
 * Purple side glows with four illustrations (0° straight rotation, 70% opacity, fade-in edge).
 */
export function SideArt() {
  return (
    <div className="side-art" aria-hidden="true">
      <div className="side-glow side-glow-left" />
      <div className="side-glow side-glow-right" />
      <img
        className="side-img side-img-1 side-l1"
        src="/illustrations/hope-illustration-1.png"
        alt=""
      />
      <img
        className="side-img side-img-3 side-l2"
        src="/illustrations/hope-illustration-3.png"
        alt=""
      />
      <img
        className="side-img side-img-4 side-r1"
        src="/illustrations/hope-illustration-4.png"
        alt=""
      />
      <img
        className="side-img side-img-2 side-r2"
        src="/illustrations/hope-illustration-2.png"
        alt=""
      />
    </div>
  );
}
