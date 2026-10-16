<template>
  <header class="header glass" :class="{ 'scrolled': isScrolled }" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'">
    <div class="container header-content">
      <div class="logo">
        <a href="/">Intelligent ERP</a>
      </div>
      <nav class="nav-links">
        <a href="#features">{{ t('nav.features') }}</a>
        <a href="#pricing">{{ t('nav.pricing') }}</a>
        <a href="#testimonials">{{ t('nav.testimonials') }}</a>
      </nav>
      <div class="actions">
        <!-- Language Switcher Dropdown (EN / AR / BN) -->
        <div class="lang-selector">
          <button class="lang-btn" @click="isLangMenuOpen = !isLangMenuOpen">
            🌐 {{ currentLangLabel }}
          </button>
          <div v-if="isLangMenuOpen" class="lang-dropdown">
            <button @click="changeLang('en')" :class="{ active: currentLang === 'en' }">🇬🇧 English (EN)</button>
            <button @click="changeLang('ar')" :class="{ active: currentLang === 'ar' }">🇸🇦 العربية (AR)</button>
            <button @click="changeLang('bn')" :class="{ active: currentLang === 'bn' }">🇧🇩 বাংলা (BN)</button>
          </div>
        </div>

        <!-- Currency Quick Selector (SAR / BDT / USD) -->
        <div class="currency-selector">
          <select v-model="currentCurrency" @change="changeCurrency" class="currency-select">
            <option value="SAR">🇸🇦 SAR (Riyal)</option>
            <option value="BDT">🇧🇩 BDT (৳ Taka)</option>
            <option value="USD">🇺🇸 USD ($ Dollar)</option>
          </select>
        </div>

        <a :href="getErpUrl('/login')" class="btn btn-outline">{{ t('nav.login') }}</a>
        <a :href="getErpUrl('/register')" class="btn btn-primary">{{ t('nav.trial') }}</a>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { translations as allTranslations } from '../data/translations.js'
import { getErpUrl } from '../config/env.js'

const isScrolled = ref(false)
const isLangMenuOpen = ref(false)
const currentLang = ref('en')
const currentCurrency = ref('SAR')

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

const currentLangLabel = computed(() => {
  if (currentLang.value === 'ar') return 'AR'
  if (currentLang.value === 'bn') return 'BN'
  return 'EN'
})

function changeLang(lang) {
  currentLang.value = lang
  isLangMenuOpen.value = false
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_lang', lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
    window.dispatchEvent(new CustomEvent('language-change', { detail: lang }))
  }
}

function changeCurrency() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_currency', currentCurrency.value)
    window.dispatchEvent(new CustomEvent('currency-change', { detail: currentCurrency.value }))
  }
}

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
  if (typeof window !== 'undefined') {
    const savedLang = localStorage.getItem('user_lang')
    if (savedLang && ['en', 'ar', 'bn'].includes(savedLang)) {
      currentLang.value = savedLang
      document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = savedLang
    }
    const savedCurr = localStorage.getItem('user_currency')
    if (savedCurr && ['SAR', 'BDT', 'USD'].includes(savedCurr)) {
      currentCurrency.value = savedCurr
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  margin: 1rem;
  transition: all 0.3s ease;
}

.header.scrolled {
  margin: 0;
  border-radius: 0;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
}

.logo a {
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
  text-decoration: none;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-links a {
  color: #cbd5e1;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: color 0.2s;
}

.nav-links a:hover {
  color: #3b82f6;
}

.actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Language Selector */
.lang-selector {
  position: relative;
}
.lang-btn {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.lang-dropdown {
  position: absolute;
  top: 110%;
  right: 0;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  min-width: 150px;
}
.lang-dropdown button {
  background: transparent;
  border: none;
  color: #cbd5e1;
  padding: 8px 12px;
  text-align: left;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
}
.lang-dropdown button:hover, .lang-dropdown button.active {
  background: #1e293b;
  color: #3b82f6;
  font-weight: bold;
}

/* Currency Select */
.currency-select {
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
  padding: 7px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
}
.currency-select option {
  background: #0f172a;
  color: #fff;
}

.btn {
  padding: 8px 18px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  transition: all 0.2s;
}
.btn-outline {
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
}
.btn-outline:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}
.btn-primary {
  background: #3b82f6;
  color: #fff;
}
.btn-primary:hover {
  background: #2563eb;
}
</style>
