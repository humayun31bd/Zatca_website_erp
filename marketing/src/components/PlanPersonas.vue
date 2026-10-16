<template>
  <section id="plan-personas" class="personas-section" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'">
    <div class="container">
      <div class="section-header">
        <h2 class="section-title">{{ t('personas.title') }}</h2>
        <p class="section-subtitle">{{ t('personas.subtitle') }}</p>
      </div>

      <div class="personas-grid">
        <div
          v-for="(item, idx) in personaItems"
          :key="idx"
          class="persona-card"
        >
          <div class="persona-icon">{{ item.icon }}</div>
          <h3 class="persona-title">{{ item.title }}</h3>
          <h4 :class="['plan-match', item.planKey]">{{ item.planMatch }}</h4>
          <p class="persona-desc">{{ item.desc }}</p>
          <ul class="persona-benefits">
            <li v-for="(b, bIdx) in item.benefits" :key="bIdx">
              ✓ {{ b }}
            </li>
          </ul>
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

const personaItems = computed(() => {
  const langObj = allTranslations[currentLang.value] || allTranslations['en']
  return langObj.personas?.items || allTranslations['en'].personas.items
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
.personas-section {
  padding: 80px 20px;
  background-color: #030712;
  color: #fff;
  font-family: 'Inter', sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 16px;
  color: #f8fafc;
}

.section-subtitle {
  color: #9ca3af;
  font-size: 1.1rem;
}

.personas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
}

.persona-card {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 16px;
  padding: 32px 24px;
  transition: transform 0.3s ease, border-color 0.3s ease;
}

.persona-card:hover {
  transform: translateY(-5px);
  border-color: #4f46e5;
}

.persona-icon {
  font-size: 3rem;
  margin-bottom: 20px;
}

.persona-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.plan-match {
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
}

.plan-match.free { color: #9ca3af; }
.plan-match.basic { color: #3b82f6; }
.plan-match.standard { color: #8b5cf6; }
.plan-match.premium { color: #f59e0b; }

.persona-desc {
  font-size: 0.95rem;
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 24px;
  min-height: 100px;
}

.persona-benefits {
  list-style: none;
  padding: 0;
  margin: 0;
}

.persona-benefits li {
  font-size: 0.9rem;
  color: #cbd5e1;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
