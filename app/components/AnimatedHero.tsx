'use client'

export default function AnimatedHero() {
  return (
    <div className="animated-hero">
      {/* Floating shapes */}
      <div className="hero-shapes" aria-hidden="true">
        <div className="shape shape-circle" />
        <div className="shape shape-ring" />
        <div className="shape shape-square" />
        <div className="shape shape-dot dot-1" />
        <div className="shape shape-dot dot-2" />
        <div className="shape shape-dot dot-3" />
        <div className="shape shape-triangle" />
      </div>

      {/* Main content */}
      <div className="hero-content">
        <p className="hero-greeting">Welcome to</p>
        <h1 className="hero-title">
          <span className="gradient-text">My Portfolio</span>
        </h1>
        <div className="hero-tagline">
          <span className="typewriter">Developer &bull; Creator &bull; Explorer</span>
        </div>
        <div className="hero-line" />
      </div>
    </div>
  )
}
