<script setup lang="ts">
import { onMounted, ref } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import { db } from '@/lib/db'
import { toast } from '@/stores/ui'
import UiIcon from '@/components/ui/UiIcon.vue'

const emit = defineEmits<{ unlocked: [] }>()

const mode = ref<'unknown' | 'create' | 'enter'>('unknown')
const password = ref('')
const repeat = ref('')
const error = ref('')
const busy = ref(false)

onMounted(async () => {
  mode.value = (await db().hasPassword()) ? 'enter' : 'create'
})

async function submit() {
  error.value = ''
  busy.value = true
  try {
    if (mode.value === 'create') {
      if (password.value.trim().length < 4) {
        error.value = 'Heslo musí mít aspoň čtyři znaky.'
        return
      }
      if (password.value !== repeat.value) {
        error.value = 'Hesla se neshodují.'
        return
      }
      await db().setPassword(password.value)
      toast('Heslo nastaveno. Zapiš si ho, obnovit ho nejde.', 'ok', 6000)
      emit('unlocked')
      return
    }

    const ok = await db().unlock(password.value)
    if (ok) emit('unlocked')
    else error.value = 'Heslo nesouhlasí.'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Nepodařilo se přihlásit.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="gate">
    <form class="gate__card" @submit.prevent="submit">
      <span class="gate__lock" aria-hidden="true">
        <UiIcon name="lock" size="xl" />
      </span>

      <template v-if="mode === 'create'">
        <h1 class="gate__title">Nastav heslo</h1>
        <p class="gate__lead">
          Otázky může upravovat jen ten, kdo zná heslo. Hrát může kdokoli s odkazem.
          Heslo si zapiš, obnovit se nedá.
        </p>
        <UiField label="Nové heslo">
          <input v-model="password" type="password" autocomplete="new-password" required />
        </UiField>
        <UiField label="Heslo znovu">
          <input v-model="repeat" type="password" autocomplete="new-password" required />
        </UiField>
      </template>

      <template v-else-if="mode === 'enter'">
        <h1 class="gate__title">Správa otázek</h1>
        <p class="gate__lead">Zadej heslo, kterým se otevírá úprava balíčků.</p>
        <UiField label="Heslo">
          <input v-model="password" type="password" autocomplete="current-password" required />
        </UiField>
      </template>

      <p v-if="error" class="gate__error" role="alert">{{ error }}</p>

      <UiButton v-if="mode !== 'unknown'" type="submit" variant="brand" size="lg" block :disabled="busy">
        {{ mode === 'create' ? 'Nastavit heslo' : 'Odemknout' }}
      </UiButton>

      <RouterLink to="/" class="gate__back">Zpět do Mučírny</RouterLink>
    </form>
  </div>
</template>

<style scoped>
.gate { flex: 1; display: grid; place-items: center; padding: var(--sp-6) var(--sp-5) var(--sp-8); }
.gate__card {
  display: grid;
  gap: var(--sp-4);
  width: min(100%, 26rem);
  padding: var(--sp-6);
  border: 1px solid var(--c-line);
  border-radius: var(--r-xl);
  background: var(--c-surface);
  box-shadow: var(--shadow-md);
  animation: rise var(--dur-slow) var(--ease-out) both;
}
.gate__lock {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border-radius: var(--r-lg);
  background: var(--c-surface-2);
  color: var(--c-brand);
}
.gate__title { font-size: var(--fs-2xl); }
.gate__lead { color: var(--c-text-muted); font-size: var(--fs-sm); line-height: var(--lh-body); }
.gate__error { color: var(--c-bad); font-size: var(--fs-sm); font-weight: 600; }
.gate__back { justify-self: center; font-size: var(--fs-sm); color: var(--c-text-faint); text-decoration: none; }
.gate__back:hover { color: var(--c-text); }

@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .gate__card { animation: none; } }
</style>
