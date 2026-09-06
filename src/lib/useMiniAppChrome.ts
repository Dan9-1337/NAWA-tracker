import { useEffect, useRef } from 'react';
import { getTelegramWebApp } from './telegram';

export type MiniAppChromeConfig = {
  main?: {
    text: string;
    visible?: boolean;
    enabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
  };
  secondary?: {
    text: string;
    visible?: boolean;
    enabled?: boolean;
    onClick?: () => void;
  };
  back?: {
    visible?: boolean;
    onClick?: () => void;
  };
  closingConfirmation?: boolean;
};

export function useMiniAppChrome(config: MiniAppChromeConfig): void {
  const mainClickRef = useRef(config.main?.onClick);
  const secondaryClickRef = useRef(config.secondary?.onClick);
  const backClickRef = useRef(config.back?.onClick);

  mainClickRef.current = config.main?.onClick;
  secondaryClickRef.current = config.secondary?.onClick;
  backClickRef.current = config.back?.onClick;

  useEffect(() => {
    const app = getTelegramWebApp();
    if (!app) return undefined;

    const { main, secondary, back, closingConfirmation } = config;

    if (closingConfirmation) app.enableClosingConfirmation();
    else app.disableClosingConfirmation();

    const mainHandler = () => mainClickRef.current?.();
    const secondaryHandler = () => secondaryClickRef.current?.();
    const backHandler = () => backClickRef.current?.();

    if (main) {
      app.mainButton.setText(main.text);
      if (main.visible) app.mainButton.show();
      else app.mainButton.hide();
      if (main.enabled === false) app.mainButton.disable();
      else app.mainButton.enable();
      if (main.loading) app.mainButton.showProgress(true);
      else app.mainButton.hideProgress();
      app.mainButton.onClick(mainHandler);
    } else {
      app.mainButton.hide();
    }

    if (secondary) {
      app.secondaryButton.setText(secondary.text);
      if (secondary.visible) app.secondaryButton.show();
      else app.secondaryButton.hide();
      if (secondary.enabled === false) app.secondaryButton.disable();
      else app.secondaryButton.enable();
      app.secondaryButton.onClick(secondaryHandler);
    } else {
      app.secondaryButton.hide();
    }

    if (back) {
      if (back.visible) app.backButton.show();
      else app.backButton.hide();
      app.backButton.onClick(backHandler);
    } else {
      app.backButton.hide();
    }

    return () => {
      app.mainButton.offClick(mainHandler);
      app.secondaryButton.offClick(secondaryHandler);
      app.backButton.offClick(backHandler);
    };
  }, [
    config.main?.text,
    config.main?.visible,
    config.main?.enabled,
    config.main?.loading,
    config.secondary?.text,
    config.secondary?.visible,
    config.secondary?.enabled,
    config.back?.visible,
    config.closingConfirmation,
  ]);
}
