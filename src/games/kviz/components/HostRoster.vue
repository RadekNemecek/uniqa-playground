<script setup lang="ts">
import { ref } from 'vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiEmpty from '@/components/ui/UiEmpty.vue'
import PlayerAvatar from './PlayerAvatar.vue'
import type { QuizPlayer } from '@/games/kviz/types'

/**
 * Soupiska za běhu hry.
 *
 * Přejmenovat a vyhodit šlo dřív jen v čekárně. Přezdívku si ale píše
 * účastník sám a nikdo ji nefiltruje, takže jeden vtipálek měl vulgarismus
 * na projektoru po celou hru, na bedně i v exportu, a moderátorka s tím
 * nemohla udělat nic. Tohle je ta chybějící páka.
 */
defineProps<{ open: boolean; players: QuizPlayer[] }>()
const emit = defineEmits<{ close: []; kick: [uid: string]; rename: [uid: string, nick: string] }>()

const editing = ref<string | null>(null)
const draft = ref('')

function startRename(p: QuizPlayer): void {
  editing.value = p.uid
  draft.value = p.nick
}

function commit(uid: string): void {
  if (editing.value !== uid) return
  const next = draft.value.trim()
  editing.value = null
  if (next.length > 0) emit('rename', uid, next)
}
</script>

<template>
  <UiModal :open="open" title="Hráči" size="md" @close="emit('close')">
    <UiEmpty
      v-if="players.length === 0"
      icon="phone"
      title="Zatím nikdo nepřipojený"
      text="Jakmile se někdo přihlásí, objeví se tady."
    />

    <ul v-else class="roster">
      <li v-for="p in players" :key="p.uid" class="row">
        <PlayerAvatar class="row__ava" :id="p.avatar" />

        <input
          v-if="editing === p.uid"
          v-model="draft"
          class="row__input"
          type="text"
          maxlength="20"
          :aria-label="`Přezdívka hráče ${p.nick}`"
          @keydown.enter="commit(p.uid)"
          @keydown.esc="editing = null"
          @blur="commit(p.uid)"
        />
        <span v-else v-fit-text class="row__nick">{{ p.nick }}</span>

        <div class="row__tools">
          <UiButton size="sm" variant="quiet" @click="startRename(p)">Přejmenovat</UiButton>
          <UiButton size="sm" variant="quiet" @click="emit('kick', p.uid)">Vyhodit</UiButton>
        </div>
      </li>
    </ul>

    <template #footer>
      <UiButton variant="ghost" @click="emit('close')">Hotovo</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.roster { display: grid; gap: var(--sp-2); list-style: none; padding: 0; }
.row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border: var(--border-w) solid var(--c-border-soft);
  border-radius: var(--r-md);
  background: var(--c-bg-card);
}
.row__ava { --ava-size: var(--control-lg); }
.row__nick { font-weight: 700; font-size: calc(var(--fs-md) * var(--fit-text, 1)); }
.row__tools { display: flex; gap: var(--sp-1); }
.row__input {
  width: 100%;
  padding: var(--sp-2) var(--sp-3);
  border: var(--border-w) solid var(--c-brand);
  border-radius: var(--r-sm);
  background: var(--c-bg-field);
  color: var(--c-text);
}

@media (max-width: 560px) {
  .row { grid-template-columns: auto minmax(0, 1fr); }
  .row__tools { grid-column: 1 / -1; justify-content: flex-end; }
}
</style>
