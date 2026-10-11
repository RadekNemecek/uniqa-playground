<script setup lang="ts">
import { useId, watch } from 'vue'
import UiField from '@/components/ui/UiField.vue'
import { account } from '@/stores/account'
import { recentGroups } from '@/lib/recent'

/**
 * Pro koho se školí: skupina a lektor. Táž dvojice údajů ve všech
 * přípravách, kvízu, desce i Výslechu, aby archiv šel číst napříč.
 *
 * Skupina se z minula nepředvyplňuje, jen nabízí: stará hodnota v poli
 * se přehlédne a zanese archiv chybou.
 *
 * Lektor se bere ze jména přihlášeného a pole na něj není nikde. Ve hrách
 * lektorky jen zdržovalo a ve Výslechu by šlo hodnocení připsat komukoli
 * jinému.
 */
withDefaults(defineProps<{ groupHint?: string }>(), { groupHint: '' })
const group = defineModel<string>('group', { required: true })
const trainer = defineModel<string>('trainer', { required: true })

const ids = useId()
const groups = recentGroups()

/** Jméno z účtu doběhne i po otevření přípravy (ověření členství jede
 *  na pozadí). */
watch(
  () => account.name,
  (name) => {
    trainer.value = name
  },
  { immediate: true },
)
</script>

<template>
  <div class="audience">
    <UiField label="Skupina (nepovinné)" :hint="groupHint">
      <input
        v-model="group"
        type="text"
        maxlength="60"
        placeholder="Např. Obchod Morava"
        autocomplete="off"
        :list="groups.length ? `${ids}-groups` : undefined"
      />
    </UiField>
    <datalist v-if="groups.length" :id="`${ids}-groups`">
      <option v-for="g in groups" :key="g" :value="g" />
    </datalist>
  </div>
</template>

<style scoped>
.audience { display: grid; gap: var(--sp-4); }
</style>
