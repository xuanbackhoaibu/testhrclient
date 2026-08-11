import { createTheme } from '@mantine/core';
import type { MantineThemeOverride } from '@mantine/core';
import type { ThemeConfig } from 'antd';

export const hrmThemeTokens = {
  colorPrimary: '#0b5ed7',
  colorPrimaryHover: '#084fb8',
  colorPrimarySoft: '#eaf2ff',
  colorSuccess: '#0f9f6e',
  colorWarning: '#f59f00',
  colorDanger: '#d92d20',
  colorText: '#0f172a',
  colorTextMuted: '#64748b',
  colorBgLayout: '#f4f7fb',
  colorSurface: '#ffffff',
  colorSurfaceSubtle: '#f8fafc',
  colorBorder: '#dfe6f0',
  colorBorderSoft: '#edf1f6',
  radius: 8,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

export const mantineTheme: MantineThemeOverride = createTheme({
  primaryColor: 'hacomBlue',
  defaultRadius: 'md',
  fontFamily: hrmThemeTokens.fontFamily,
  headings: {
    fontFamily: hrmThemeTokens.fontFamily,
    fontWeight: '650',
  },
  colors: {
    hacomBlue: [
      '#eaf2ff',
      '#d6e6ff',
      '#a9caff',
      '#78abfb',
      '#4e90f4',
      '#2d7bea',
      '#0b5ed7',
      '#084fb8',
      '#083f93',
      '#07336f',
    ],
  },
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    ActionIcon: {
      defaultProps: {
        radius: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    PasswordInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    NumberInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    MultiSelect: {
      defaultProps: {
        radius: 'md',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'md',
        centered: true,
      },
    },
    Paper: {
      defaultProps: {
        withBorder: true,
        shadow: 'none',
      },
    },
    Table: {
      defaultProps: {
        verticalSpacing: 'sm',
        horizontalSpacing: 'md',
      },
    },
  },
});

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: hrmThemeTokens.colorPrimary,
    colorInfo: hrmThemeTokens.colorPrimary,
    colorSuccess: hrmThemeTokens.colorSuccess,
    colorWarning: hrmThemeTokens.colorWarning,
    colorError: hrmThemeTokens.colorDanger,
    colorText: hrmThemeTokens.colorText,
    colorTextSecondary: hrmThemeTokens.colorTextMuted,
    colorBgLayout: hrmThemeTokens.colorBgLayout,
    colorBgContainer: hrmThemeTokens.colorSurface,
    colorBorder: hrmThemeTokens.colorBorder,
    borderRadius: hrmThemeTokens.radius,
    borderRadiusLG: hrmThemeTokens.radius,
    borderRadiusSM: 6,
    fontFamily: hrmThemeTokens.fontFamily,
    controlHeight: 36,
  },
  components: {
    Button: {
      borderRadius: hrmThemeTokens.radius,
      controlHeight: 36,
      fontWeight: 650,
      primaryShadow: 'none',
    },
    Input: {
      borderRadius: hrmThemeTokens.radius,
      controlHeight: 36,
    },
    InputNumber: {
      borderRadius: hrmThemeTokens.radius,
      controlHeight: 36,
    },
    Select: {
      borderRadius: hrmThemeTokens.radius,
      controlHeight: 36,
    },
    Modal: {
      borderRadiusLG: hrmThemeTokens.radius,
      titleFontSize: 16,
    },
    Table: {
      borderColor: hrmThemeTokens.colorBorderSoft,
      headerBg: hrmThemeTokens.colorSurfaceSubtle,
      headerColor: hrmThemeTokens.colorText,
      rowHoverBg: hrmThemeTokens.colorPrimarySoft,
    },
    Descriptions: {
      labelBg: hrmThemeTokens.colorSurfaceSubtle,
    },
  },
};
