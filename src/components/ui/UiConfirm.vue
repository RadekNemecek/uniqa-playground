<script setup lang="ts">
import UiModal from '@/components/ui/UiModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { ui, answerConfirm } from '@/stores/ui'
</script>

<template>
  <UiModal
    :open="!!ui.confirm"
    :title="ui.confirm?.title ?? ''"
    size="sm"
    @close="answerConfirm(false)"
  >
    <p class="text">{{ ui.confirm?.text }}</p>
    <template #footer>
      <UiButton variant="ghost" @click="answerConfirm(false)">Zrušit</UiButton>
      <UiButton
        :variant="ui.confirm?.danger ? 'danger' : 'gold'"
        @click="answerConfirm(true)"
      >
        {{ ui.confirm?.confirmLabel }}
      </UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.text { color: var(--c-text-muted); line-height: var(--lh-body); }
</style>
