// Estat de l'execució per als botons: idle → running ⇄ paused → idle.
// gate() s'espera després de cada acció de Karel: fa la pausa de la velocitat
// o, en mode pas a pas, espera el següent clic de «Pas».

export const DELAYS = [0, 30, 100, 250, 500, 1000];

export function createRunner({ getDelay, onState = () => {} }) {
  let state = 'idle';
  let stepMode = false;
  let stopRequested = false;
  let wake = null; // desperta una pausa o una espera de velocitat
  let done = Promise.resolve();

  const set = s => {
    if (state !== s) {
      state = s;
      onState(s);
    }
  };
  const wait = ms => new Promise(resolve => {
    const timer = ms === null ? null : setTimeout(resolve, ms);
    wake = () => {
      clearTimeout(timer);
      resolve();
    };
  }).finally(() => { wake = null; });

  async function gate() {
    if (stopRequested) return;
    if (stepMode) {
      set('paused');
      await wait(null);
      if (!stopRequested) set('running');
    } else {
      const ms = getDelay();
      if (ms) await wait(ms);
    }
  }

  function start(task, { step = false } = {}) {
    if (state !== 'idle') return done;
    stepMode = step;
    stopRequested = false;
    set('running');
    done = (async () => {
      try {
        return await task({ gate, shouldStop: () => stopRequested });
      } finally {
        stepMode = false;
        wake = null;
        set('idle');
      }
    })();
    return done;
  }

  return {
    start,
    // «Pas»: avança una acció; si anava seguit, es para després de la següent.
    step() {
      stepMode = true;
      if (state === 'paused') wake?.();
    },
    resume() {
      stepMode = false;
      wake?.();
    },
    stop() {
      if (state === 'idle') return;
      stopRequested = true;
      wake?.();
    },
    whenIdle: () => done.then(() => {}, () => {}),
    get state() {
      return state;
    },
    get stepping() {
      return stepMode;
    },
  };
}
