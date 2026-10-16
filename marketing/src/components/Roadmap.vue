<template>
  <section id="roadmap" class="roadmap-section">
    <div class="container">
      <div class="section-header">
        <span class="badge-tag">VERSION CONTROL & ROADMAP</span>
        <h2 class="title">Intelligent ERP Release Roadmap</h2>
        <p class="subtitle">
          Transparent feature deployment schedule. Track current live capabilities and upcoming version rollouts.
        </p>

        <!-- Version Filter Tabs -->
        <div class="version-tabs">
          <button
            v-for="ver in versions"
            :key="ver.id"
            :class="['ver-tab', { active: selectedVersion === ver.id }]"
            @click="selectedVersion = ver.id"
          >
            <span class="ver-badge" :style="{ backgroundColor: ver.color }">{{ ver.label }}</span>
            <span class="ver-desc">{{ ver.timeline }}</span>
          </button>
        </div>
      </div>

      <!-- Feature Grid -->
      <div class="features-grid">
        <div
          v-for="item in filteredFeatures"
          :key="item.id"
          class="feature-card"
        >
          <div class="card-header">
            <span class="cat-tag">{{ item.category }}</span>
            <span :class="['status-badge', item.status.toLowerCase().replace(' ', '-')]">
              {{ item.status }}
            </span>
          </div>

          <h3 class="feature-title">{{ item.name }}</h3>
          <p class="feature-desc">{{ item.description }}</p>

          <div class="card-footer">
            <span class="ver-pill">{{ item.version }}</span>
            <div class="plans-list">
              <span v-for="p in item.plans" :key="p" class="plan-chip">{{ p }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { ROADMAP_FEATURES } from '../data/roadmap';

const selectedVersion = ref('all');

const versions = [
  { id: 'all', label: 'All Versions', timeline: 'Full Lifecycle', color: '#64748B' },
  { id: 'v1.0', label: 'v1.0 Baseline', timeline: 'Live Now', color: '#10B981' },
  { id: 'v1.5', label: 'v1.5 Release', timeline: 'Q4 2026', color: '#3B82F6' },
  { id: 'v2.0', label: 'v2.0 AI & Enterprise', timeline: 'Q1 2027', color: '#8B5CF6' },
];

const filteredFeatures = computed(() => {
  if (selectedVersion.value === 'all') return ROADMAP_FEATURES;
  return ROADMAP_FEATURES.filter((f) => f.version === selectedVersion.value);
});
</script>

<style scoped>
.roadmap-section {
  padding: 80px 20px;
  background-color: #0B0F17;
  color: #FFFFFF;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-header {
  text-align: center;
  margin-bottom: 48px;
}

.badge-tag {
  display: inline-block;
  background: rgba(59, 130, 246, 0.15);
  color: #60A5FA;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  margin-bottom: 16px;
}

.title {
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #FFFFFF, #94A3B8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: #94A3B8;
  font-size: 16px;
  max-width: 600px;
  margin: 0 auto 32px auto;
}

.version-tabs {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.ver-tab {
  background: #1E293B;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 10px 18px;
  color: #94A3B8;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;
}

.ver-tab.active {
  border-color: #3B82F6;
  background: rgba(59, 130, 246, 0.1);
  color: #FFFFFF;
}

.ver-badge {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: bold;
  color: #FFFFFF;
}

.ver-desc {
  font-size: 12px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.feature-card {
  background: #111827;
  border: 1px solid #1F2937;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.2s, border-color 0.2s;
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: #374151;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.cat-tag {
  font-size: 11px;
  font-weight: 600;
  color: #60A5FA;
  text-transform: uppercase;
}

.status-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 10px;
}

.status-badge.live {
  background: rgba(16, 185, 129, 0.15);
  color: #34D399;
}

.status-badge.in-testing {
  background: rgba(59, 130, 246, 0.15);
  color: #60A5FA;
}

.status-badge.planned {
  background: rgba(139, 92, 246, 0.15);
  color: #C084FC;
}

.feature-title {
  font-size: 16px;
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 8px;
}

.feature-desc {
  font-size: 13px;
  color: #94A3B8;
  line-height: 1.5;
  margin-bottom: 20px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #1F2937;
}

.ver-pill {
  font-size: 11px;
  font-weight: 800;
  color: #E2E8F0;
  background: #1E293B;
  padding: 2px 8px;
  border-radius: 4px;
}

.plans-list {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.plan-chip {
  font-size: 10px;
  background: #1F2937;
  color: #CBD5E1;
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
