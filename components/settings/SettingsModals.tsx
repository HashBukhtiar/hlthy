import React from 'react';
import { View, Text } from 'react-native';
import { CustomSelector, SelectorItem } from '@/components/CustomSelector';

interface SettingsModalsProps {
  archetypeData: SelectorItem[];
  privacyOptions: Array<{ label: string; value: string; icon: string; description?: string }>;
  permissionOptions: Array<{ label: string; value: string; icon: string }>;
  themeOptions: Array<{ label: string; value: string; icon: string }>;
  languageOptions: Array<{ label: string; value: string; icon: string }>;
  isModalVisible: (modalId: string) => boolean;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  settings: any;
  updateSetting: (key: string, value: any) => void;
  insights: string[];
  privacyLevel: 'open' | 'moderate' | 'strict';
}

export function SettingsModals({
  archetypeData,
  privacyOptions,
  permissionOptions,
  themeOptions,
  languageOptions,
  isModalVisible,
  openModal,
  closeModal,
  settings,
  updateSetting,
  insights,
  privacyLevel,
}: SettingsModalsProps) {
  const PRIVACY_LEVEL_COLORS: Record<string, string> = {
    open: '#FF9500',
    moderate: '#007AFF',
    strict: '#34C759',
  };

  return (
    <>
      {isModalVisible('archetype') && (
        <CustomSelector
          items={archetypeData}
          value={settings.archetype || null}
          onSelect={(value) => updateSetting('archetype', value)}
          placeholder="Select archetype"
          title="Archetype"
          icon="body"
          modalVisible={isModalVisible('archetype')}
          setModalVisible={(visible) => (visible ? openModal('archetype') : closeModal('archetype'))}
          variant="fullWidth"
        />
      )}

      {isModalVisible('privacy') && (
        <CustomSelector
          items={privacyOptions}
          value={settings.profileVisibility ?? 'public'}
          onSelect={(value) => updateSetting('profileVisibility', value)}
          placeholder="Select visibility"
          title="Profile Visibility"
          icon="eye"
          modalVisible={isModalVisible('privacy')}
          setModalVisible={(visible) => (visible ? openModal('privacy') : closeModal('privacy'))}
          variant="fullWidth"
        />
      )}

      {isModalVisible('message') && (
        <CustomSelector
          items={permissionOptions.map((opt) => ({
            label: opt.label,
            value: opt.value,
            icon: opt.icon,
            description:
              opt.value === 'everyone'
                ? 'Anyone can message you'
                : 'Only followers can message you, unless you allow others',
          }))}
          value={settings.messagePermission}
          onSelect={(value) => updateSetting('messagePermission', value)}
          placeholder="Select message permission"
          title="Who Can Message You"
          icon="mail"
          modalVisible={isModalVisible('message')}
          setModalVisible={(visible) => (visible ? openModal('message') : closeModal('message'))}
          variant="fullWidth"
        />
      )}

      {isModalVisible('theme') && (
        <CustomSelector
          items={themeOptions.map((opt) => ({
            label: opt.label,
            value: opt.value,
            icon: opt.icon,
            description:
              opt.value === 'light'
                ? 'Light color scheme'
                : opt.value === 'dark'
                ? 'Dark color scheme'
                : 'Follow device settings',
          }))}
          value={settings.theme}
          onSelect={(value) => updateSetting('theme', value)}
          placeholder="Select theme"
          title="App Theme"
          icon="color-palette"
          modalVisible={isModalVisible('theme')}
          setModalVisible={(visible) => (visible ? openModal('theme') : closeModal('theme'))}
          variant="fullWidth"
        />
      )}

      {isModalVisible('language') && (
        <CustomSelector
          items={languageOptions.map((opt) => ({
            label: opt.label,
            value: opt.value,
            icon: opt.icon,
          }))}
          value={settings.language}
          onSelect={(value) => updateSetting('language', value)}
          placeholder="Select language"
          title="App Language"
          icon="globe"
          modalVisible={isModalVisible('language')}
          setModalVisible={(visible) => (visible ? openModal('language') : closeModal('language'))}
          variant="fullWidth"
        />
      )}

      {isModalVisible('weightUnit') && (
        <CustomSelector
          items={[
            {
              label: 'Metric (kg)',
              value: 'metric',
              icon: 'barbell',
              description: 'Kilograms for weight measurements',
            },
            {
              label: 'Imperial (lbs)',
              value: 'imperial',
              icon: 'barbell',
              description: 'Pounds for weight measurements',
            },
          ]}
          value={settings.units?.weight}
          onSelect={(value) => updateSetting('units.weight', value)}
          placeholder="Select weight unit"
          title="Weight Unit"
          icon="barbell"
          modalVisible={isModalVisible('weightUnit')}
          setModalVisible={(visible) =>
            visible ? openModal('weightUnit') : closeModal('weightUnit')
          }
          variant="fullWidth"
        />
      )}

      {isModalVisible('distanceUnit') && (
        <CustomSelector
          items={[
            {
              label: 'Metric (km)',
              value: 'metric',
              icon: 'walk',
              description: 'Kilometers for distance measurements',
            },
            {
              label: 'Imperial (mi)',
              value: 'imperial',
              icon: 'walk',
              description: 'Miles for distance measurements',
            },
          ]}
          value={settings.units?.distance}
          onSelect={(value) => updateSetting('units.distance', value)}
          placeholder="Select distance unit"
          title="Distance Unit"
          icon="walk"
          modalVisible={isModalVisible('distanceUnit')}
          setModalVisible={(visible) =>
            visible ? openModal('distanceUnit') : closeModal('distanceUnit')
          }
          variant="fullWidth"
        />
      )}

      {isModalVisible('insights') && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <View
            style={{
              backgroundColor: '#1C1C1E',
              borderRadius: 16,
              padding: 20,
              margin: 20,
              maxHeight: '70%',
              width: '90%',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ alignItems: 'center', marginBottom: 20, padding: 12, backgroundColor: '#2C2C2E', borderRadius: 8, flexDirection: 'row' }}>
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: PRIVACY_LEVEL_COLORS[privacyLevel],
                    marginRight: 8,
                  }}
                />
              </View>
            </View>

            <View style={{ maxHeight: 300 }}>
              {insights.length > 0 ? (
                insights.map((insight, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: '#2C2C2E',
                      padding: 12,
                      borderRadius: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 14, lineHeight: 20 }}>
                      {insight}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: '#999', fontSize: 14, textAlign: 'center', fontStyle: 'italic' }}>
                  No insights available
                </Text>
              )}
            </View>

            <View
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTopWidth: 1,
                borderTopColor: '#3C3C3E',
              }}
            >
              <View
                onTouchEnd={() => closeModal('insights')}
                style={{
                  backgroundColor: '#007AFF',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>Close</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </>
  );
}
