<script setup lang="ts">
import { ArrowUpRight, ChefHat } from '@lucide/vue'

definePageMeta({
  layout: 'profile',
  middleware: 'front-access',
  frontAccessKey: 'orderingfood'
})

useHead({ title: '个人中心 - Curry 中心' })
</script>

<template>
  <main class="profile-page">
    <section class="profile-intro">
      <p class="eyebrow">PERSONAL SPACE</p>
      <h1>个人中心</h1>
      <p>常用的个人功能，从这里进入。</p>
    </section>

    <section class="profile-features" aria-labelledby="profile-features-title">
      <header>
        <h2 id="profile-features-title">我的功能</h2>
      </header>
      <div class="profile-feature-grid">
        <NuxtLink class="profile-feature-card" to="/profile/ordering-food">
          <span class="profile-feature-icon"><ChefHat :size="24" :stroke-width="1.8" /></span>
          <span class="profile-feature-copy">
            <strong>在线点菜</strong>
            <small>挑选菜品，预约想吃的时间。</small>
          </span>
          <ArrowUpRight class="profile-feature-arrow" :size="20" :stroke-width="1.8" aria-hidden="true" />
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
