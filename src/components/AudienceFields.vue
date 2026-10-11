<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import UiField from '@/components/ui/UiField.vue'
import { account } from '@/stores/account'
import { recentGroups } from '@/lib/recent'

/**
 * Pro koho se školí: skupina a lektor. Stejná dvojice polí ve všech
 * přípravách, kvízu, desce i Výslechu, aby archiv šel číst napříč.
 *
 * Skupina se z minula nepředvyplňuje, jen nabízí: stará hodnota v poli
 * se přehlédne a zanese archiv chybou. Lektor se předvyplní jménem
 * přihlášeného, protože hru obvykle spouští ten, kdo školí. Když ji
 * spouští někdo za něj, nabídnou se jména z týmu.
 */
withDefaults(defineProps<{ groupHint?: string }>(), { groupHint: '' })
const group = defineModel<string>('group', { required: true })
const trainer = defineModel<string>('trainer', { required: true })

const ids = useId()
const groups = recentGroups()
const teamNames = ref<string[]>([])

/** Jméno z účtu doběhne i po otevření přípravy (ověření členství jede
 *  na pozadí). Doplní se jen do pole, na které ještě nikdo nesáhl. */
const touched = ref(false)
watch(
  () => account.name,
  (name) => {
    if (!touched.value && !trainer.value.trim() && name) trainer.value = name
  },
  { immediate: true },
)

let stop: (() => void) | null = null
onMounted(async () => {
  if (account.status !== 'member') return
  try {
    const fb = await import('@/lib/firebase')
    stop = fb.watchMembers(
      (list) => {
        teamNames.value = list
          .map((m) => m.name)
          .filter((n) => n.length > 0)
          .sort((a, b) => a.localeCompare(b, 'cs'))
      },
      () => {
        /* Nabídka jmen je pohodlí navíc, pole jde vyplnit i bez ní. */
      },
    )
  } catch {
    /* viz výš */
  }
})
onBeforeUnmount(() => stop?.())
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
    <UiField label="Lektor/ka (nepovinné)">
      <input
        v-model="trainer"
        type="text"
        maxlength="80"
        placeholder="Jméno"
        autocomplete="off"
        :list="teamNames.length ? `${ids}-team` : undefined"
        @input="touched = true"
      />
    </UiField>
    <datalist v-if="groups.length" :id="`${ids}-groups`">
      <option v-for="g in groups" :key="g" :value="g" />
    </datalist>
    <datalist v-if="teamNames.length" :id="`${ids}-team`">
      <option v-for="n in teamNames" :key="n" :value="n" />
    </datalist>
  </div>
</template>

<style scoped>
.audience { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: var(--sp-4); align-items: start; }
@media (max-width: 960px) { .audience { grid-template-columns: minmax(0, 1fr); } }
</style>
