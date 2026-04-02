import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  ArrowRight, 
  Shield, 
  Zap, 
  Clock, 
  Globe, 
  Layers, 
  Hexagon,
  Sparkles,
  Cpu,
  Network,
  ArrowUpRight,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';
import './Landing.css';

interface LandingProps {
  onEnter: () => void;
}

export default function Landing({ onEnter }: LandingProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const features = [
    { icon: Zap, title: 'Real-Time Settlement', desc: 'Blockchain-powered instant settlement vs traditional T+2', delay: '0.1s' },
    { icon: Shield, title: 'Secure Transfers', desc: 'Cryptographic verification of every transaction', delay: '0.2s' },
    { icon: Clock, title: 'Time Comparison', desc: 'Side-by-side visualization of settlement paths', delay: '0.3s' },
    { icon: Globe, title: 'Multi-Node Network', desc: 'Distributed ledger architecture simulation', delay: '0.4s' },
  ];

  const techStack = [
    { name: 'React', icon: Cpu },
    { name: 'TypeScript', icon: Layers },
    { name: 'WebSocket', icon: Network },
    { name: 'D3 Flow', icon: Hexagon },
  ];

  return (
    <div className="landing">
      <div className="noise-overlay" />
      
      <nav className={`landing-nav ${isVisible ? 'visible' : ''}`}>
        <div className="nav-brand">
          <div className="brand-icon">
            <Hexagon size={24} />
          </div>
          <span>BlockSettle</span>
        </div>
        <div className="nav-actions">
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </nav>

      <div 
        className="hero-section"
        style={{
          transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`
        }}
      >
        <div className="hero-bg-elements">
          <div className="grid-pattern" />
          <div className="floating-shapes">
            <div className="shape shape-1" />
            <div className="shape shape-2" />
            <div className="shape shape-3" />
          </div>
        </div>

        <div className={`hero-content ${isVisible ? 'visible' : ''}`}>
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>Blockchain Securities Simulator</span>
          </div>
          
          <h1 className="hero-title">
            <span className="title-line">Settlement</span>
            <span className="title-line accent">Reimagined</span>
          </h1>
          
          <p className="hero-subtitle">
            Experience the future of securities trading. Compare traditional T+2 settlement 
            against real-time blockchain transactions in an immersive visual environment.
          </p>

          <div className="hero-actions">
            <button className="enter-btn" onClick={onEnter}>
              <span>Enter Simulator</span>
              <ArrowRight size={20} />
            </button>
            <a href="#features" className="learn-btn">
              <span>Explore Features</span>
              <ArrowUpRight size={16} />
            </a>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <span className="stat-value">T+2</span>
              <span className="stat-label">Traditional</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">~3s</span>
              <span className="stat-label">Blockchain</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-value">100%</span>
              <span className="stat-label">Settlement Rate</span>
            </div>
          </div>
        </div>
      </div>

      <section id="features" className={`features-section ${isVisible ? 'visible' : ''}`}>
        <div className="section-header">
          <span className="section-tag">Capabilities</span>
          <h2>Built for the future of finance</h2>
        </div>

        <div className="features-grid">
          {features.map((feature, i) => (
            <div 
              key={i} 
              className="feature-card"
              style={{ animationDelay: feature.delay }}
            >
              <div className="feature-icon">
                <feature.icon size={24} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
              <div className="feature-glow" />
            </div>
          ))}
        </div>
      </section>

      <section className={`tech-section ${isVisible ? 'visible' : ''}`}>
        <div className="tech-track">
          <div className="tech-items">
            {techStack.map((tech, i) => (
              <div key={i} className="tech-item">
                <tech.icon size={18} />
                <span>{tech.name}</span>
              </div>
            ))}
            {techStack.map((tech, i) => (
              <div key={`dup-${i}`} className="tech-item">
                <tech.icon size={18} />
                <span>{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`cta-section ${isVisible ? 'visible' : ''}`}>
        <div className="cta-content">
          <h2>Ready to explore?</h2>
          <p>Launch the simulator and experience the difference yourself</p>
          <button className="enter-btn large" onClick={onEnter}>
            <span>Start Simulation</span>
            <ArrowRight size={22} />
          </button>
        </div>
        <div className="cta-decoration">
          <div className="pulse-ring" />
          <div className="pulse-ring delay-1" />
          <div className="pulse-ring delay-2" />
        </div>
      </section>

      <footer className={`landing-footer ${isVisible ? 'visible' : ''}`}>
        <div className="footer-content">
          <div className="footer-brand">
            <Hexagon size={20} />
            <span>BlockSettle</span>
          </div>
          <p>Blockchain Securities Settlement Simulator</p>
        </div>
        <div className="scroll-indicator">
          <span>Scroll to explore</span>
          <ChevronDown size={16} />
        </div>
      </footer>
    </div>
  );
}