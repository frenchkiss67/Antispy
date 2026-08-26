import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { saveSettings } from '../settings';
import { isDuressDefined, removeDuressPin } from '../security';
import { sendIntrusionAlert } from '../webhook';
import ScreenHeader from '../components/ScreenHeader';
import Icon from '../components/Icon';
import t from '../i18n';

const GRACE_OPTIONS = [0, 30, 60, 300];

function graceLabel(seconds) {
  if (seconds === 0) {
    return t('graceImmediate');
  }
  if (seconds < 60) {
    return t('graceSeconds', seconds);
  }
  return t('graceMinutes', seconds / 60);
}

export default function SettingsScreen({
  settings,
  onSettingsChange,
  onChangePin,
  onSetDuress,
  onLock,
  decoy,
}) {
  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl);
  const [testing, setTesting] = useState(false);
  const [duressDefined, setDuressDefined] = useState(false);

  useEffect(() => {
    if (!decoy) {
      isDuressDefined().then(setDuressDefined);
    }
  }, [decoy]);

  const update = async (partial) => {
    onSettingsChange(await saveSettings(partial));
  };

  // La valeur validée est lue sur l'événement, pas dans l'état : à la fin de
  // saisie, l'état peut ne pas encore avoir été répercuté.
  const handleWebhookSave = (value) => {
    const trimmed = (value ?? webhookUrl).trim();
    if (trimmed !== '' && !/^https:\/\//i.test(trimmed)) {
      Alert.alert(t('webhook'), t('webhookHttpsOnly'));
      return;
    }
    update({ webhookUrl: trimmed });
  };

  const handleRemoveDuress = () => {
    Alert.alert(t('duressSection'), t('duressRemoveMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await removeDuressPin();
          setDuressDefined(false);
        },
      },
    ]);
  };

  const handleLocationToggle = async (enabled) => {
    if (enabled) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
    }
    update({ locationEnabled: enabled });
  };

  const handleWebhookTest = async () => {
    const url = webhookUrl.trim();
    if (!/^https:\/\//i.test(url)) {
      Alert.alert(t('webhook'), t('webhookHttpsOnly'));
      return;
    }
    setTesting(true);
    const ok = await sendIntrusionAlert(url, {
      date: new Date().toISOString(),
      test: true,
    });
    setTesting(false);
    Alert.alert(t('webhook'), ok ? t('webhookTestOk') : t('webhookTestKo'));
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('settingsTitle')} onLock={onLock} />
      <ScrollView contentContainerStyle={styles.content}>

      <TouchableOpacity style={styles.actionButton} onPress={onChangePin}>
        <Icon name="key" size={18} color="#e6edf3" strokeWidth={1.8} />
        <Text style={styles.actionButtonText}>{t('changePin')}</Text>
      </TouchableOpacity>

      {!decoy && (
        <View style={styles.section}>
          <Text style={styles.label}>
            {duressDefined ? `✓ ${t('duressDefined')}` : t('duressSection')}
          </Text>
          <Text style={styles.help}>{t('duressHelp')}</Text>
          <View style={styles.chips}>
            <TouchableOpacity style={styles.chip} onPress={onSetDuress}>
              <Text style={styles.chipText}>
                {duressDefined ? t('duressEdit') : t('duressSet')}
              </Text>
            </TouchableOpacity>
            {duressDefined && (
              <TouchableOpacity
                style={[styles.chip, styles.chipDanger]}
                onPress={handleRemoveDuress}
              >
                <Text style={styles.chipText}>{t('duressRemove')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Sections sensibles masquées en mode leurre : leur seule présence
          (effacement, camouflage, surveillance, webhook) révélerait qu'il
          ne s'agit pas d'une simple application de coffre. */}
      {!decoy && (
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>{t('wipeSetting')}</Text>
            <Switch
              value={settings.wipeEnabled}
              onValueChange={(value) => update({ wipeEnabled: value })}
            />
          </View>
          <Text style={styles.help}>{t('wipeHelp')}</Text>
        </View>
      )}

      {!decoy && (
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>{t('camouflage')}</Text>
            <Switch
              value={settings.camouflage}
              onValueChange={(value) => update({ camouflage: value })}
            />
          </View>
          <Text style={styles.help}>{t('camouflageHelp')}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>{t('graceDelay')}</Text>
        <View style={styles.chips}>
          {GRACE_OPTIONS.map((seconds) => (
            <TouchableOpacity
              key={seconds}
              style={[
                styles.chip,
                settings.graceDelaySec === seconds && styles.chipActive,
              ]}
              onPress={() => update({ graceDelaySec: seconds })}
            >
              <Text style={styles.chipText}>{graceLabel(seconds)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {!decoy && (
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>{t('locationSetting')}</Text>
            <Switch
              value={settings.locationEnabled}
              onValueChange={handleLocationToggle}
            />
          </View>
          <Text style={styles.help}>{t('locationHelp')}</Text>
        </View>
      )}

      {!decoy && (
        <View style={styles.section}>
          <Text style={styles.label}>{t('webhook')}</Text>
          <TextInput
            style={styles.input}
            value={webhookUrl}
            onChangeText={setWebhookUrl}
            onEndEditing={(e) => handleWebhookSave(e?.nativeEvent?.text)}
            placeholder={t('webhookPlaceholder')}
            placeholderTextColor="#8b949e"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <Text style={styles.help}>{t('webhookHelp')}</Text>
          {webhookUrl.trim() !== '' && (
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleWebhookTest}
              disabled={testing}
            >
              <Text style={styles.testButtonText}>
                {testing ? '…' : t('webhookTest')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!decoy && <Text style={styles.about}>{t('about')}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  content: {
    paddingTop: 6,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  title: {
    color: '#e6edf3',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#21262d',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 20,
  },
  actionButtonText: {
    color: '#e6edf3',
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#e6edf3',
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
    paddingRight: 10,
  },
  help: {
    color: '#8b949e',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  chip: {
    backgroundColor: '#21262d',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: '#1f6feb',
  },
  chipDanger: {
    backgroundColor: '#da3633',
  },
  chipText: {
    color: '#e6edf3',
    fontSize: 13,
  },
  input: {
    backgroundColor: '#0d1117',
    borderRadius: 8,
    color: '#e6edf3',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  testButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#21262d',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginTop: 10,
  },
  testButtonText: {
    color: '#58a6ff',
    fontSize: 13,
  },
  about: {
    color: '#8b949e',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 10,
  },
});
