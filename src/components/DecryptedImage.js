import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { loadImageUri } from '../cryptoStore';

// Affiche une image du stockage chiffré (déchiffrée en mémoire, jamais
// écrite en clair sur le disque). Les images héritées non chiffrées sont
// affichées directement.
export default function DecryptedImage({ file, style, resizeMode }) {
  const [uri, setUri] = useState(null);

  useEffect(() => {
    let active = true;
    setUri(null);
    loadImageUri(file).then((loaded) => {
      if (active) {
        setUri(loaded);
      }
    });
    return () => {
      active = false;
    };
  }, [file]);

  if (!uri) {
    return <View style={style} />;
  }
  return <Image source={{ uri }} style={style} resizeMode={resizeMode} />;
}
