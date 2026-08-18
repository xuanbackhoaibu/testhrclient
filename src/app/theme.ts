import { createTheme } from '@mantine/core';
import type { MantineThemeOverride } from '@mantine/core';
import type { ThemeConfig } from 'antd';

export const hrmThemeTokens = {
  colorPrimary: '#D71920',
  colorPrimaryHover: '#B3141A',
  colorPrimarySoft: '#FCE9EA',
  colorPrimaryDarkText: '#F08A8F',
  colorAccent: '#D8C764',
  colorAccentSoft: '#FBF7E4',
  colorAccentDarkText: '#E5D78A',
  colorSuccess: '#16a34a',
  colorWarning: '#D8C764',
  colorDanger: '#D71920',
  colorText: '#1F2328',
  colorTextMuted: '#595959',
  colorBgLayout: '#F5F6F7',
  colorSurface: '#ffffff',
  colorSurfaceSubtle: '#F5F5F5',
  colorBorder: '#E5E7EB',
  colorBorderSoft: '#F0F0F0',
  radius: 8,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

export const mantineTheme: MantineThemeOverride = createTheme({
  primaryColor: 'hacomRed',
  defaultRadius: 'md',
  fontFamily: hrmThemeTokens.fontFamily,
  headings: {
    fontFamily: hrmThemeTokens.fontFamily,
    fontWeight: '600',
  },
  colors: {
    hacomRed: [
      '#FCE9EA',
      '#F7C8CA',
      '#F08A8F',
      '#EA5D64',
      '#E13E46',
      '#D71920',
      '#B3141A',
      '#971015',
      '#780C10',
      '#5B080C',
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
    Checkbox: {
      defaultProps: {
        color: 'blue',
      },
    },
    Switch: {
      defaultProps: {
        color: 'blue',
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
      fontWeight: 600,
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
