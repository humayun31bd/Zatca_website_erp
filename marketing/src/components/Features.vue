<template>
  <section id="features" class="features-section">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">Everything You Need to Run Your Business</h2>
        <p class="section-subtitle">A comprehensive suite of tools built for modern retailers and service providers in Saudi Arabia.</p>
      </div>
      
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">🚀</div>
          <h3 class="feature-title">1-Click ZATCA Setup</h3>
          <p class="feature-desc">Instantly connect with ZATCA Phase 2 without complex configurations. Generate compliant e-invoices out of the box.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">💰</div>
          <h3 class="feature-title">Smart POS System</h3>
          <p class="feature-desc">Fast, responsive point of sale. Handle multiple payment methods, cash drawers, and generate dynamic QR codes instantly.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">📦</div>
          <h3 class="feature-title">Advanced Inventory</h3>
          <p class="feature-desc">Track stock across multiple branches. Multi-unit support, automated low stock alerts, and real-time valuation.</p>
        </div>
        
        <div class="feature-card">
          <div class="feature-icon">📱</div>
          <h3 class="feature-title">WhatsApp Integration</h3>
          <p class="feature-desc">Send invoices and receipts directly to your customers' WhatsApp automatically upon checkout completion.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features-section {
  padding: 100px 20px;
  background-color: #0b0f19; /* Premium dark background */
  color: #fff;
  position: relative;
  overflow: hidden;
}

/* Subtle background glow effect */
.features-section::before {
  content: '';
  position: absolute;
  top: -200px;
  right: -200px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(62, 100, 255, 0.15) 0%, rgba(11, 15, 25, 0) 70%);
  border-radius: 50%;
  pointer-events: none;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.section-subtitle {
  font-size: 1.125rem;
  color: #9ca3af;
  max-width: 600px;
  margin: 0 auto;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 30px;
}

.feature-card {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 40px 30px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  cursor: default;
}

.feature-card:hover {
  transform: translateY(-5px);
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 20px rgba(99, 102, 241, 0.2);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 24px;
  display: inline-block;
  padding: 15px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 12px;
}

.feature-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: #f8fafc;
}

.feature-desc {
  font-size: 0.95rem;
  color: #94a3b8;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .section-title {
    font-size: 2rem;
  }
  .features-section {
    padding: 60px 20px;
  }
}
</style>
