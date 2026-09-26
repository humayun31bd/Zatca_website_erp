<template>
  <section id="pricing" class="pricing-section">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">Simple, Transparent Pricing</h2>
        <p class="section-subtitle">Choose the perfect plan for your business scale. No hidden fees.</p>
      </div>

      <div class="pricing-grid">
        <!-- Starter Plan -->
        <div class="pricing-card">
          <div class="plan-header">
            <h3 class="plan-name">Starter</h3>
            <div class="plan-price">
              <span class="currency">SAR</span>
              <span class="amount">199</span>
              <span class="period">/mo</span>
            </div>
            <p class="plan-desc">Perfect for small retail shops starting out with e-invoicing.</p>
          </div>
          <ul class="plan-features">
            <li><span class="check">✓</span> 1 POS Register</li>
            <li><span class="check">✓</span> ZATCA Phase 1 & 2 Ready</li>
            <li><span class="check">✓</span> Basic Inventory</li>
            <li><span class="check">✓</span> Email Support</li>
          </ul>
          <button class="btn-primary outline">Get Started</button>
        </div>

        <!-- Pro Plan (Highlighted) -->
        <div class="pricing-card popular">
          <div class="popular-badge">Most Popular</div>
          <div class="plan-header">
            <h3 class="plan-name">Professional</h3>
            <div class="plan-price">
              <span class="currency">SAR</span>
              <span class="amount">499</span>
              <span class="period">/mo</span>
            </div>
            <p class="plan-desc">For growing businesses needing advanced inventory and multi-branch.</p>
          </div>
          <ul class="plan-features">
            <li><span class="check">✓</span> Unlimited POS Registers</li>
            <li><span class="check">✓</span> Advanced Multi-Unit Inventory</li>
            <li><span class="check">✓</span> WhatsApp Invoice Delivery</li>
            <li><span class="check">✓</span> Multi-Branch Support</li>
            <li><span class="check">✓</span> 24/7 Priority Support</li>
          </ul>
          <button class="btn-primary">Start Free Trial</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pricing-section {
  padding: 100px 20px;
  background-color: #050811; /* Even darker for contrast */
  color: #fff;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 70px;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fff 0%, #818cf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.section-subtitle {
  font-size: 1.125rem;
  color: #9ca3af;
}

.pricing-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 40px;
  align-items: center;
}

.pricing-card {
  background: #111827;
  border: 1px solid #1f2937;
  border-radius: 20px;
  padding: 40px;
  width: 100%;
  max-width: 400px;
  position: relative;
  transition: all 0.3s ease;
}

.pricing-card:hover {
  transform: translateY(-5px);
  border-color: #374151;
}

.pricing-card.popular {
  background: linear-gradient(180deg, #1e1b4b 0%, #111827 100%);
  border: 1px solid #4f46e5;
  box-shadow: 0 0 30px rgba(79, 70, 229, 0.15);
  transform: scale(1.05);
}

.pricing-card.popular:hover {
  transform: scale(1.05) translateY(-5px);
  box-shadow: 0 10px 40px rgba(79, 70, 229, 0.25);
}

.popular-badge {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(90deg, #4f46e5, #ec4899);
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.plan-name {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 15px;
  color: #f8fafc;
}

.plan-price {
  display: flex;
  align-items: baseline;
  margin-bottom: 15px;
}

.currency {
  font-size: 1rem;
  color: #9ca3af;
  margin-right: 5px;
}

.amount {
  font-size: 3.5rem;
  font-weight: 700;
  color: #fff;
}

.period {
  font-size: 1rem;
  color: #9ca3af;
  margin-left: 5px;
}

.plan-desc {
  font-size: 0.95rem;
  color: #9ca3af;
  margin-bottom: 30px;
  line-height: 1.5;
  min-height: 42px;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 40px 0;
}

.plan-features li {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  color: #cbd5e1;
  font-size: 1rem;
}

.check {
  color: #10b981;
  font-weight: bold;
  margin-right: 12px;
  font-size: 1.2rem;
}

.btn-primary {
  width: 100%;
  padding: 14px;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #4f46e5;
  color: white;
  border: none;
}

.btn-primary:hover {
  background: #4338ca;
}

.btn-primary.outline {
  background: transparent;
  border: 1px solid #4f46e5;
  color: #e0e7ff;
}

.btn-primary.outline:hover {
  background: rgba(79, 70, 229, 0.1);
}

@media (max-width: 900px) {
  .pricing-card.popular {
    transform: scale(1);
  }
  .pricing-card.popular:hover {
    transform: translateY(-5px);
  }
}
</style>
