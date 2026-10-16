<template>
  <section id="features" class="features-section" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">{{ t('features.title') }}</h2>
        <p class="section-subtitle">{{ t('features.subtitle') }}</p>
      </div>
      
      <div class="features-grid">
        <div v-for="(item, idx) in featureItems" :key="idx" class="feature-card">
          <div class="feature-icon">{{ item.icon }}</div>
          <h3 class="feature-title">{{ item.title }}</h3>
          <p class="feature-desc">{{ item.desc }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { translations as allTranslations } from '../data/translations.js'

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

const featureItems = computed(() => {
  const langObj = allTranslations[currentLang.value] || allTranslations['en']
  return langObj.features?.items || allTranslations['en'].features.items
})

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
