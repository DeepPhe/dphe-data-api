import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type {EditUrlFunction} from '@docusaurus/plugin-content-docs';

const organizationName = 'DeepPhe';
const projectName = 'dphe-data-api';
const repositoryUrl = `https://github.com/${organizationName}/${projectName}`;
const openApiJsonUrl = 'https://deepphe.github.io/dphe-data-api/openapi.json';
const editUrl: EditUrlFunction = ({docPath}) =>
  `${repositoryUrl}/edit/main/docs/${docPath}`;

const config: Config = {
  title: 'DeepPhe Data API Documentation',
  tagline: 'Serve DeepPhe patient, cohort, concept, and OMOP data',
  url: 'https://deepphe.github.io',
  baseUrl: '/dphe-data-api/',
  trailingSlash: false,

  organizationName,
  projectName,
  onBrokenLinks: 'throw',

  future: {
    v4: true,
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mdx1Compat: {
      comments: true,
      admonitions: true,
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'DeepPhe Data API',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'apiGuide',
          position: 'left',
          label: 'Guide',
        },
        {
          to: '/reference/openapi',
          position: 'left',
          label: 'API Reference',
        },
        {
          href: openApiJsonUrl,
          label: 'OpenAPI JSON',
          position: 'right',
        },
        {
          href: repositoryUrl,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'DeepPhe',
          items: [
            {
              label: 'Data API repository',
              href: repositoryUrl,
            },
            {
              label: 'OpenAPI JSON',
              href: openApiJsonUrl,
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} DeepPhe.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
