<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <div class="profile-frame">
    <header class="profile-topbar">
      <NuxtLink to="/" class="checkin-brand">
        <img src="/favicon.ico" alt="" />
        <strong>Curry 中心</strong>
      </NuxtLink>
      <NuxtLink v-if="route.path !== '/profile'" class="profile-back-link" to="/profile">返回个人中心</NuxtLink>
      <span v-else class="profile-topbar-label">个人中心</span>
    </header>
    <slot />
  </div>
</template>
