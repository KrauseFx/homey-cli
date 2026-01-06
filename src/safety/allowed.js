'use strict';

const DEFAULT_ALLOWED = new Set([
  'onoff',
  'dim',
  'light_hue',
  'light_saturation',
  'light_temperature',
  'light_mode',
  'target_temperature',
  'thermostat_mode',
  'volume_set',
  'speaker_playing',
  'windowcoverings_set',
  'fan_speed',
  'fan_mode',
  'alarm_arm',
  'vacuumcleaner_state',
]);

function getAllowedCapabilities() {
  const override = process.env.HOMEY_CLI_ALLOWED_CAPABILITIES;
  if (!override) return DEFAULT_ALLOWED;

  const set = new Set(
    override
      .split(',')
      .map(entry => entry.trim())
      .filter(Boolean),
  );

  return set.size ? set : DEFAULT_ALLOWED;
}

module.exports = {
  DEFAULT_ALLOWED,
  getAllowedCapabilities,
};
