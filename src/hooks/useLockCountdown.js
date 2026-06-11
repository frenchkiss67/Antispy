import { useEffect, useState } from 'react';
import { getLockRemaining, setLockRemaining } from '../security';

// Compte à rebours du blocage anti-bruteforce, persisté toutes les 5 s :
// indépendant de l'horloge système, il se met en pause si l'application
// est fermée et reprend où il en était.
export default function useLockCountdown() {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    getLockRemaining().then(setRemaining);
  }, []);

  useEffect(() => {
    if (remaining <= 0) {
      return undefined;
    }
    const timer = setTimeout(() => {
      const next = remaining - 1;
      setRemaining(next);
      if (next % 5 === 0) {
        setLockRemaining(next);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  return [remaining, setRemaining];
}
