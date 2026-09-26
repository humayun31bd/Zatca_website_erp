<template>
  <header class="header glass" :class="{ 'scrolled': isScrolled }">
    <div class="container header-content">
      <div class="logo">
        <a href="/">Numou ERP</a>
      </div>
      <nav class="nav-links">
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
        <a href="#testimonials">Testimonials</a>
      </nav>
      <div class="actions">
        <a href="/login" class="btn btn-outline">Log in</a>
        <a href="/register" class="btn btn-primary">Start Free Trial</a>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isScrolled = ref(false)

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll)
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
  background: var(--glass-bg);
  box-shadow: var(--glass-shadow);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
}

.logo a {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
  letter-spacing: -0.5px;
}

.nav-links {
  display: flex;
  gap: 2rem;
}

.nav-links a {
  font-weight: 500;
  color: var(--text-secondary);
  transition: color 0.2s ease;
}

.nav-links a:hover {
  color: var(--primary-color);
}

.actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
}
</style>
