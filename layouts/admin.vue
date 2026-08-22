<script setup lang="ts">
import {
  BookOpen,
  ChevronDown,
  ClipboardList,
  CookingPot,
  FileText,
  LayoutDashboard,
  ListTodo,
  Settings,
  ShieldCheck,
  Tags
} from '@lucide/vue'
import type { Component } from 'vue'

type AdminMenuItem = {
  label: string
  icon: Component
  to: string
  superOnly?: boolean
}

type AdminMenuGroup = {
  id: string
  label: string
  icon: Component
  items: AdminMenuItem[]
}

const route = useRoute()
const { user, logout } = useAuth()
const isMenuOpen = ref(false)

const allMenuGroups: AdminMenuGroup[] = [
  {
    id: 'daily',
    label: '日常管理',
    icon: CookingPot,
    items: [
      { label: '菜谱管理', icon: CookingPot, to: '/admin/recipes' },
      { label: '点菜记录', icon: ClipboardList, to: '/admin/food-orders' },
      { label: '计划管理', icon: ListTodo, to: '/admin/plans' }
    ]
  },
  {
    id: 'knowledge',
    label: '知识库',
    icon: BookOpen,
    items: [
      { label: '知识分类', icon: Tags, to: '/admin/library/categories' },
      { label: '知识文章', icon: FileText, to: '/admin/library/articles' }
    ]
  },
  {
    id: 'system',
    label: '系统设置',
    icon: Settings,
    items: [
      { label: '访问验证', icon: ShieldCheck, to: '/admin/access', superOnly: true }
    ]
  }
]

const menuGroups = computed(() => allMenuGroups
  .map(group => ({
    ...group,
    items: group.items.filter(item => !item.superOnly || user.value?.role === 'super')
  }))
  .filter(group => group.items.length))

const openGroups = ref<string[]>(allMenuGroups.map(group => group.id))

const toggleGroup = (groupId: string) => {
  openGroups.value = openGroups.value.includes(groupId)
    ? openGroups.value.filter(id => id !== groupId)
    : [...openGroups.value, groupId]
}

const pageTitle = computed(() => {
  if (route.path === '/admin/recipes') return '菜谱管理'
  if (route.path === '/admin/plans') return '计划管理'
  if (route.path === '/admin/food-orders') return '点菜记录'
  if (route.path.startsWith('/admin/library/categories')) return '知识分类'
  if (route.path.startsWith('/admin/library/articles')) return '知识文章'
  if (route.path.startsWith('/admin/access')) return '访问验证'
  return '概览'
})
const roleLabel = computed(() => user.value?.role === 'super' ? '超级管理员' : '管理员')

const isActive = (path: string) => {
  if (path === '/admin') return route.path === '/admin'
  return route.path === path || route.path.startsWith(`${path}/`)
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const handleLogout = async () => {
  await logout()
  await navigateTo('/login')
}

watch(() => route.fullPath, closeMenu)
</script>

<template>
  <div class="admin-app">
    <button
      v-if="isMenuOpen"
      class="admin-overlay"
      type="button"
      aria-label="关闭菜单"
      @click="closeMenu"
    />

    <aside class="admin-sidebar" :class="{ open: isMenuOpen }">
      <NuxtLink class="admin-brand" to="/admin" @click="closeMenu">
        <img src="/favicon.ico" alt="" />
        <span>
          <strong>Curry 中心</strong>
          <small>管理后台</small>
        </span>
      </NuxtLink>

      <nav class="admin-nav" aria-label="后台菜单">
        <p class="admin-nav-label">工作台</p>
        <NuxtLink class="admin-nav-overview" to="/admin" :class="{ active: isActive('/admin') }">
          <LayoutDashboard :size="18" aria-hidden="true" />
          <span>概览</span>
        </NuxtLink>

        <div class="admin-nav-groups">
          <section v-for="group in menuGroups" :key="group.id" class="admin-nav-group">
            <button
              class="admin-nav-group-trigger"
              type="button"
              :aria-expanded="openGroups.includes(group.id)"
              :aria-controls="`admin-nav-${group.id}`"
              @click="toggleGroup(group.id)"
            >
              <component :is="group.icon" :size="18" aria-hidden="true" />
              <span>{{ group.label }}</span>
              <ChevronDown
                class="admin-nav-chevron"
                :class="{ open: openGroups.includes(group.id) }"
                :size="16"
                aria-hidden="true"
              />
            </button>

            <Transition name="admin-nav-submenu">
              <div v-if="openGroups.includes(group.id)" :id="`admin-nav-${group.id}`" class="admin-nav-children">
                <NuxtLink
                  v-for="item in group.items"
                  :key="item.to"
                  :to="item.to"
                  :class="{ active: isActive(item.to) }"
                >
                  <component :is="item.icon" :size="16" aria-hidden="true" />
                  <span>{{ item.label }}</span>
                </NuxtLink>
              </div>
            </Transition>
          </section>
        </div>
      </nav>

      <div class="admin-sidebar-footer">
        <div class="admin-user">
          <span class="admin-avatar">{{ user?.username?.slice(0, 1).toUpperCase() || 'A' }}</span>
          <span>
            <strong>{{ user?.username || 'admin' }}</strong>
            <small>{{ roleLabel }}</small>
          </span>
        </div>
        <button type="button" @click="handleLogout">退出登录</button>
      </div>
    </aside>

    <section class="admin-main">
      <header class="admin-toolbar">
        <button
          class="admin-menu-button"
          type="button"
          aria-label="打开菜单"
          title="打开菜单"
          @click="isMenuOpen = true"
        >
          <span />
          <span />
          <span />
        </button>
        <div>
          <p>Curry 中心</p>
          <h1>{{ pageTitle }}</h1>
        </div>
        <NuxtLink class="admin-site-link" to="/">返回站点</NuxtLink>
      </header>

      <main class="admin-content">
        <slot />
      </main>
    </section>
  </div>
</template>
