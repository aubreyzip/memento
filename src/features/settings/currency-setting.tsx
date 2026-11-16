import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';

import { DEVICE_CURRENCY, type CurrencyPreference } from '@/domain/settings';
import { deviceCurrencyCode } from '@/services/locale/device-currency';

import type { SettingController } from './setting-controller';

const CurrencyContext = createContext<SettingController<'defaultCurrency'> | null>(null);

export function CurrencySettingProvider({
  controller,
  children,
}: {
  controller: SettingController<'defaultCurrency'>;
  children: ReactNode;
}) {
  return <CurrencyContext.Provider value={controller}>{children}</CurrencyContext.Provider>;
}

const noController = {
  subscribe: () => () => {},
  getValue: (): CurrencyPreference => DEVICE_CURRENCY,
  setValue: async () => {},
};

/**
 * The default currency for new prices (O-010): the saved choice, or the device region's
 * currency while "Device region" is selected. `deviceCode` is '' when the region has none.
 */
export function useDefaultCurrency() {
  const controller = useContext(CurrencyContext) ?? noController;
  const preference = useSyncExternalStore(controller.subscribe, controller.getValue);
  const deviceCode = deviceCurrencyCode();
  return {
    preference,
    deviceCode,
    effective: preference === DEVICE_CURRENCY ? deviceCode : preference,
    setPreference: controller.setValue,
  };
}
