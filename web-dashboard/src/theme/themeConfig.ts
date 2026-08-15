import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

const themeConfig: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#aa3bff', // A modern purple accent
    colorBgBase: '#0f1015',
    colorBgContainer: '#16171d',
    colorBgElevated: '#1f2028',
    colorBorder: '#2e303a',
    borderRadius: 8,
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
  },
  components: {
    Layout: {
      bodyBg: '#0f1015',
      headerBg: '#16171d',
      siderBg: '#16171d',
    },
    Menu: {
      darkItemBg: '#16171d',
      darkItemSelectedBg: '#aa3bff',
    },
    Table: {
      headerBg: '#1f2028',
      headerColor: '#9ca3af',
      rowHoverBg: '#1f2028',
    },
    Card: {
      colorBgContainer: '#16171d',
      colorBorderSecondary: '#2e303a',
    }
  }
};

export default themeConfig;
