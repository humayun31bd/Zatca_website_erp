<template>
  <section class="hero" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'">
    <div class="container hero-inner">
      <div class="hero-content">
        <h1 class="hero-title">
          {{ t('hero.titlePre') }} <br/>
          <span class="highlight">{{ t('hero.titleHighlight') }}</span>
        </h1>
        <p class="hero-subtitle">
          {{ t('hero.subtitle') }}
        </p>
        <div class="hero-cta">
          <a :href="getErpUrl('/register')" class="btn btn-primary btn-lg">{{ t('hero.ctaPrimary') }}</a>
          <a href="#pricing" class="btn btn-outline btn-lg">{{ t('hero.ctaSecondary') }}</a>
        </div>
        <div class="hero-stats">
          <div class="stat">
            <span class="stat-number">{{ t('hero.stat1') }}</span>
            <span class="stat-label">{{ t('hero.stat1Label') }}</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ t('hero.stat2') }}</span>
            <span class="stat-label">{{ t('hero.stat2Label') }}</span>
          </div>
          <div class="stat">
            <span class="stat-number">{{ t('hero.stat3') }}</span>
            <span class="stat-label">{{ t('hero.stat3Label') }}</span>
          </div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="dashboard-mockup glass">
          <div class="mockup-header">
            <div class="dots">
              <span></span><span></span><span></span>
            </div>
          </div>
          <div class="mockup-body">
            <!-- Simplified abstract shapes representing dashboard -->
            <div class="skeleton-chart"></div>
            <div class="skeleton-cards">
              <div class="skeleton-card"></div>
              <div class="skeleton-card"></div>
            </div>
            <div class="skeleton-list"></div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { translations as allTranslations } from '../data/translations.js'
import { getErpUrl } from '../config/env.js'

const currentLang = ref('en')

function t(key) {
  const parts = key.split('.')
  let obj = allTranslations[currentLang.value] || allTranslations['en']
  for (const p of parts) {
    if (obj && obj[p] !== undefined) {
      obj = obj[p]
    } else {
      return key
    }
  }
  return obj
}

const handleLangChange = (e) => {
  if (e.detail) {
    currentLang.value = e.detail
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('user_lang')
    if (saved) currentLang.value = saved
    window.addEventListener('language-change', handleLangChange)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('language-change', handleLangChange)
  }
})
</script>

<style scoped>
.hero {
  padding: 180px 0 100px;
  position: relative;
  overflow: hidden;
}

/* Background decorative blobs */
.hero::before {
  content: '';
  position: absolute;
  top: -10%;
  right: -5%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(0,112,243,0.15) 0%, rgba(255,255,255,0) 70%);
  border-radius: 50%;
  z-index: -1;
}

.hero::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: -10%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(255,255,255,0) 70%);
  border-radius: 50%;
  z-index: -1;
}

.hero-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.hero-title {
  font-size: 4rem;
  margin-bottom: 1.5rem;
}

.highlight {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin-bottom: 2.5rem;
  max-width: 500px;
}

.hero-cta {
  display: flex;
  gap: 1rem;
  margin-bottom: 4rem;
}

.btn-lg {
  padding: 1rem 2rem;
  font-size: 1.125rem;
}

.hero-stats {
  display: flex;
  gap: 3rem;
  border-top: 1px solid var(--glass-border);
  padding-top: 2rem;
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Mockup */
.dashboard-mockup {
  width: 100%;
  height: 500px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: perspective(1000px) rotateY(-5deg) rotateX(5deg);
  transition: transform 0.5s ease;
}

.dashboard-mockup:hover {
  transform: perspective(1000px) rotateY(0deg) rotateX(0deg);
}

.mockup-header {
  height: 40px;
  background: rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  padding: 0 1rem;
}

.dots {
  display: flex;
  gap: 6px;
}

.dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff5f56;
}
.dots span:nth-child(2) { background: #ffbd2e; }
.dots span:nth-child(3) { background: #27c93f; }

.mockup-body {
  padding: 2rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.skeleton-chart {
  height: 150px;
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(0,112,243,0.1), rgba(0,112,243,0.2));
}

.skeleton-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.skeleton-card {
  height: 100px;
  border-radius: 8px;
  background: rgba(0,0,0,0.03);
}

.skeleton-list {
  flex: 1;
  border-radius: 8px;
  background: rgba(0,0,0,0.03);
}

@media (max-width: 992px) {
  .hero-inner {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .hero-subtitle {
    margin: 0 auto 2.5rem;
  }
  .hero-cta {
    justify-content: center;
  }
  .hero-stats {
    justify-content: center;
  }
  .dashboard-mockup {
    transform: none;
  }
}
</style>
