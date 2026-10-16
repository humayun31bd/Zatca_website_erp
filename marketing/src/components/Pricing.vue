<template>
  <section id="pricing" class="pricing-section" :dir="currentLang === 'ar' ? 'rtl' : 'ltr'">
    <div class="container">

      <!-- ── Header ── -->
      <div class="section-header">
        <p class="overline">{{ t('pricing.overline') }}</p>
        <h2 class="section-title">{{ t('pricing.title') }}</h2>
        <p class="section-subtitle">
          {{ t('pricing.subtitle') }}
        </p>

        <div class="controls-wrapper">
          <!-- Currency selector -->
          <div class="currency-toggle" role="group" aria-label="Select Currency">
            <button
              v-for="curr in currencies"
              :key="curr.id"
              :class="['currency-btn', { active: activeCurrency === curr.id }]"
              @click="setCurrency(curr.id)"
            >
              {{ curr.flag }} {{ curr.label }} ({{ curr.code }})
            </button>
          </div>

          <!-- Billing cycle toggle -->
          <div class="cycle-toggle" role="group" aria-label="Billing cycle">
            <button
              v-for="c in cycles"
              :key="c.id"
              :class="['cycle-btn', { active: activeCycle === c.id }]"
              @click="activeCycle = c.id"
            >
              {{ c.label }}
              <span v-if="c.badge" class="cycle-badge">{{ c.badge }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Plan Cards ── -->
      <div class="plans-grid">
        <div
          v-for="plan in plans"
          :key="plan.id"
          :class="['plan-card', { popular: plan.popular }]"
          :style="plan.popular ? `--accent: ${plan.color}` : `--accent: ${plan.color}`"
        >
          <div v-if="plan.popular" class="popular-badge">{{ t('pricing.mostPopular') }}</div>

          <div class="plan-top">
            <h3 class="plan-name">{{ plan.name }}</h3>
            <p class="plan-tagline">{{ plan.tagline }}</p>

            <div class="plan-price-block">
              <template v-if="plan.id === 'free'">
                <span class="price-amount">Free</span>
                <span class="price-sub">{{ t('pricing.freeForever') }}</span>
              </template>
              <template v-else>
                <div class="price-row">
                  <span class="price-currency">{{ currentCurrencyMeta.symbol }}</span>
                  <span class="price-amount">{{ getConvertedPrice(plan.cycles[activeCycle].price).toLocaleString() }}</span>
                </div>
                <span class="price-sub">{{ cycleSubLabel }}</span>
                <div class="price-perday">
                  {{ currentCurrencyMeta.symbol }} {{ getConvertedPrice(plan.cycles[activeCycle].perDay).toLocaleString() }}/{{ t('pricing.perDay') }}
                  <span v-if="plan.cycles[activeCycle].amc > 0" class="amc-note">
                    + {{ currentCurrencyMeta.symbol }} {{ getConvertedPrice(plan.cycles[activeCycle].amc).toLocaleString() }} {{ t('pricing.amcNote') }}
                  </span>
                </div>
              </template>
            </div>

            <p class="plan-desc">{{ plan.description }}</p>
          </div>

          <ul class="plan-highlights">
            <li v-for="h in plan.highlights" :key="h">
              <span class="hi-check" :style="`color: ${plan.color}`">✓</span>
              {{ h }}
            </li>
          </ul>

          <button
            class="plan-cta"
            :style="`background: ${plan.accentGradient}`"
            @click="handleCta(plan)"
          >
            {{ plan.cta }}
          </button>
        </div>
      </div>

      <!-- ── Feature Comparison ── -->
      <div class="comparison-section">
        <h3 class="comparison-title">{{ t('pricing.fullComparison') }}</h3>
        <p class="comparison-subtitle">{{ t('pricing.comparisonSub') }}</p>

        <div class="comparison-header sticky-header">
          <div class="col-feature">{{ t('pricing.featureCol') }}</div>
          <div v-for="p in plans" :key="p.id" class="col-plan" :style="`color: ${p.color}`">
            {{ p.name }}
          </div>
        </div>

        <div
          v-for="group in featureGroups"
          :key="group.id"
          class="feature-group"
        >
          <button
            class="group-toggle"
            @click="toggleGroup(group.id)"
            :aria-expanded="openGroups.includes(group.id)"
          >
            <span class="group-icon">{{ group.icon }}</span>
            <span class="group-title">{{ group.title }}</span>
            <span class="group-sub">{{ group.subtitle }}</span>
            <span class="group-chevron" :class="{ open: openGroups.includes(group.id) }">›</span>
          </button>

          <div v-if="openGroups.includes(group.id)" class="group-rows">
            <div
              v-for="f in group.features"
              :key="f.name"
              class="feature-row"
            >
              <div class="col-feature">{{ f.name }}</div>
              <div v-for="p in plans" :key="p.id" class="col-plan">
                <span v-if="f[p.id] === true"  class="feat-yes">✓</span>
                <span v-else-if="f[p.id] === false" class="feat-no">—</span>
                <span v-else class="feat-val">{{ f[p.id] }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Add-ons ── -->
      <div class="addons-section">
        <h3 class="addons-title">{{ t('pricing.softwareAddons') }}</h3>
        <p class="addons-subtitle">{{ t('pricing.addonsSub') }}</p>
        <div class="addons-grid">
          <div v-for="addon in addOns" :key="addon.name" class="addon-card">
            <span class="addon-icon">{{ addon.icon }}</span>
            <div class="addon-body">
              <strong class="addon-name">{{ addon.name }}</strong>
              <span class="addon-price">{{ addon.price }}</span>
              <p class="addon-desc">{{ addon.description }}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  getLocalizedPlans,
  getLocalizedCycles,
  getLocalizedFeatureGroups,
  getLocalizedAddOns
} from '../data/pricing-data.js';
import { translations as allTranslations } from '../data/translations.js';
import { getErpUrl } from '../config/env.js';

const currentLang = ref('en');

function t(key) {
  const parts = key.split('.');
  let obj = allTranslations[currentLang.value] || allTranslations['en'];
  for (const p of parts) {
    if (obj && obj[p] !== undefined) {
      obj = obj[p];
    } else {
      return key;
    }
  }
  return obj;
}

// ── Dynamic Localized Data ───────────────────────────────────────────────────
const plans = computed(() => getLocalizedPlans(currentLang.value));
const cycles = computed(() => getLocalizedCycles(currentLang.value));
const featureGroups = computed(() => getLocalizedFeatureGroups(currentLang.value));
const addOns = computed(() => getLocalizedAddOns(currentLang.value));

// ── Currencies Config ───────────────────────────────────────────────────────
const currencies = [
  { id: 'SAR', code: 'SAR', label: 'Saudi Riyal', flag: '🇸🇦', symbol: 'SAR', rate: 1.0 },
  { id: 'BDT', code: 'BDT', label: 'Bangladeshi Taka', flag: '🇧🇩', symbol: '৳ BDT', rate: 31.5 },
  { id: 'USD', code: 'USD', label: 'US Dollar', flag: '🇺🇸', symbol: '$ USD', rate: 0.27 },
];
const activeCurrency = ref('SAR');

function setCurrency(currId) {
  activeCurrency.value = currId;
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_currency', currId);
    window.dispatchEvent(new CustomEvent('currency-change', { detail: currId }));
  }
}

const currentCurrencyMeta = computed(() => {
  return currencies.find((c) => c.id === activeCurrency.value) || currencies[0];
});

function getConvertedPrice(sarAmount) {
  if (sarAmount === 0) return 0;
  const curr = currentCurrencyMeta.value;
  if (curr.id === 'SAR') return sarAmount;
  if (curr.id === 'BDT') return Math.round(sarAmount * 31.5);
  if (curr.id === 'USD') return Math.round(sarAmount * 0.27);
  return sarAmount;
}

// ── Billing cycle ──────────────────────────────────────────────────────────
const activeCycle = ref('annual');
const cycleSubLabel = computed(() => {
  const c = cycles.value.find(item => item.id === activeCycle.value);
  return c ? c.subLabel : '/ year';
});

// ── Feature groups collapse ─────────────────────────────────────────────────
const openGroups = ref(['core', 'inventory']);
function toggleGroup(id) {
  const idx = openGroups.value.indexOf(id);
  if (idx === -1) openGroups.value.push(id);
  else openGroups.value.splice(idx, 1);
}

// ── CTA ────────────────────────────────────────────────────────────────────
function handleCta(plan) {
  const targetUrl = getErpUrl(`/register?plan=${plan.id}&cycle=${activeCycle.value}&currency=${activeCurrency.value}`);
  window.location.href = targetUrl;
}

const handleLangChange = (e) => {
  if (e.detail) currentLang.value = e.detail;
};

const handleCurrencyChange = (e) => {
  if (e.detail) activeCurrency.value = e.detail;
};

onMounted(() => {
  if (typeof window !== 'undefined') {
    const savedLang = localStorage.getItem('user_lang');
    if (savedLang) currentLang.value = savedLang;

    const savedCurr = localStorage.getItem('user_currency');
    if (savedCurr) activeCurrency.value = savedCurr;

    window.addEventListener('language-change', handleLangChange);
    window.addEventListener('currency-change', handleCurrencyChange);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('language-change', handleLangChange);
    window.removeEventListener('currency-change', handleCurrencyChange);
  }
});
</script>

<style scoped>
/* ── Layout ────────────────────────────────────────────────────────────────── */
.pricing-section {
  padding: 100px 20px 80px;
  background: #050811;
  color: #fff;
  font-family: 'Inter', sans-serif;
}
.container {
  max-width: 1200px;
  margin: 0 auto;
}

/* ── Header & Controls ───────────────────────────────────────────────────────── */
.section-header {
  text-align: center;
  margin-bottom: 60px;
}
.overline {
  font-size: 0.75rem;
  letter-spacing: 3px;
  color: #3b82f6;
  font-weight: 700;
  margin-bottom: 8px;
}
.section-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 12px;
}
.section-subtitle {
  font-size: 1.1rem;
  color: #94a3b8;
  max-width: 600px;
  margin: 0 auto 32px;
}

.controls-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

/* ── Currency Toggle ───────────────────────────────────────────────────────── */
.currency-toggle {
  display: inline-flex;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 40px;
  padding: 4px;
}
.currency-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 8px 18px;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.currency-btn.active {
  background: #3b82f6;
  color: #fff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* ── Cycle Toggle ─────────────────────────────────────────────────────────── */
.cycle-toggle {
  display: inline-flex;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 40px;
  padding: 4px;
}
.cycle-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 10px 20px;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}
.cycle-btn.active {
  background: #1e293b;
  color: #fff;
}
.cycle-badge {
  font-size: 0.65rem;
  background: #10b981;
  color: #fff;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 6px;
}

/* ── Plan Cards ────────────────────────────────────────────────────────────── */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
  margin-bottom: 80px;
}
.plan-card {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 20px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  transition: transform 0.3s ease, border-color 0.3s ease;
}
.plan-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent);
}
.plan-card.popular {
  border: 2px solid var(--accent);
  background: linear-gradient(180deg, #1e1b4b 0%, #0f172a 100%);
}
.popular-badge {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--accent);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 14px;
  border-radius: 20px;
  text-transform: uppercase;
}
.plan-name {
  font-size: 1.5rem;
  font-weight: 800;
  margin-bottom: 4px;
}
.plan-tagline {
  font-size: 0.85rem;
  color: #94a3b8;
  margin-bottom: 24px;
}
.plan-price-block {
  margin-bottom: 24px;
}
.price-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.price-currency {
  font-size: 1.1rem;
  font-weight: 700;
  color: #94a3b8;
}
.price-amount {
  font-size: 2.5rem;
  font-weight: 900;
  color: #fff;
}
.price-sub {
  font-size: 0.85rem;
  color: #64748b;
}
.price-perday {
  font-size: 0.8rem;
  color: #10b981;
  margin-top: 6px;
}
.amc-note {
  color: #f59e0b;
}
.plan-desc {
  font-size: 0.85rem;
  color: #94a3b8;
  line-height: 1.5;
  margin-bottom: 24px;
}
.plan-highlights {
  list-style: none;
  padding: 0;
  margin: 0 0 32px 0;
}
.plan-highlights li {
  font-size: 0.85rem;
  color: #cbd5e1;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.plan-cta {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  color: #fff;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  transition: opacity 0.2s ease;
}
.plan-cta:hover {
  opacity: 0.9;
}

/* ── Feature Comparison ────────────────────────────────────────────────────── */
.comparison-section {
  margin-bottom: 80px;
}
.comparison-title {
  font-size: 1.8rem;
  font-weight: 800;
  text-align: center;
  margin-bottom: 8px;
}
.comparison-subtitle {
  text-align: center;
  color: #94a3b8;
  margin-bottom: 32px;
  font-size: 0.95rem;
}
.sticky-header {
  display: grid;
  grid-template-columns: 2fr repeat(4, 1fr);
  padding: 16px 20px;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  font-weight: 700;
  margin-bottom: 12px;
}
.col-feature {
  color: #f8fafc;
}
.col-plan {
  text-align: center;
}
.feature-group {
  margin-bottom: 12px;
}
.group-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  padding: 14px 20px;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 12px;
  color: #fff;
  cursor: pointer;
  text-align: left;
}
.group-icon {
  margin-right: 12px;
  font-size: 1.2rem;
}
.group-title {
  font-weight: 700;
  font-size: 1rem;
}
.group-sub {
  color: #64748b;
  font-size: 0.85rem;
  margin-left: 12px;
  flex: 1;
}
.group-chevron {
  font-size: 1.4rem;
  color: #64748b;
  transition: transform 0.2s ease;
}
.group-chevron.open {
  transform: rotate(90deg);
}
.group-rows {
  background: #090d16;
  border: 1px solid #1e293b;
  border-top: none;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  padding: 8px 20px;
}
.feature-row {
  display: grid;
  grid-template-columns: 2fr repeat(4, 1fr);
  padding: 12px 0;
  border-bottom: 1px solid #1e293b;
  font-size: 0.85rem;
  align-items: center;
}
.feature-row:last-child {
  border-bottom: none;
}
.feat-yes {
  color: #10b981;
  font-weight: bold;
}
.feat-no {
  color: #475569;
}
.feat-val {
  color: #cbd5e1;
}

/* ── Add-ons ───────────────────────────────────────────────────────────────── */
.addons-section {
  text-align: center;
}
.addons-title {
  font-size: 1.8rem;
  font-weight: 800;
  margin-bottom: 8px;
}
.addons-subtitle {
  color: #94a3b8;
  margin-bottom: 32px;
}
.addons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}
.addon-card {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  text-align: left;
}
.addon-icon {
  font-size: 1.8rem;
}
.addon-name {
  display: block;
  font-size: 1rem;
  color: #fff;
}
.addon-price {
  display: block;
  font-size: 0.85rem;
  color: #3b82f6;
  font-weight: 700;
  margin-bottom: 6px;
}
.addon-desc {
  font-size: 0.8rem;
  color: #94a3b8;
  margin: 0;
}
</style>
