<template>
  <nav class="navbar">
    <div class="navbar__inner">
      <a href="/" class="navbar__logo">
        <div class="navbar__logo-icon">I</div>
        <span>Intelligent <span class="text-gradient">ERP</span></span>
      </a>

      <div class="navbar__links" :class="{ 'active': isMobileMenuOpen }">
        <a href="/" class="navbar__link">Home</a>
        <a href="#features" class="navbar__link">Features</a>
        <a href="#pricing" class="navbar__link">Pricing</a>
      </div>

      <div class="navbar__actions">
        <button class="lang-toggle" @click="toggleLang">
          {{ currentLang === 'en' ? '🌐 العربية' : '🌐 English' }}
        </button>
        <a href="https://erp.intelligentdive.com" class="btn btn--primary btn--small">Dashboard</a>
      </div>

      <div class="navbar__hamburger" @click="isMobileMenuOpen = !isMobileMenuOpen">
        <span></span><span></span><span></span>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue';

const isMobileMenuOpen = ref(false);
const currentLang = ref('en'); // Placeholder for actual i18n logic

const toggleLang = () => {
  // In a real app, this would route to /ar/ or /en/
  currentLang.value = currentLang.value === 'en' ? 'ar' : 'en';
  document.documentElement.lang = currentLang.value;
  document.documentElement.dir = currentLang.value === 'ar' ? 'rtl' : 'ltr';
};
</script>

<style scoped>
/* Scoped overrides if needed, otherwise relies on global.css */
</style>
