import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  apiGuide: [
    'index',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: ['getting-started/installation', 'getting-started/running-the-api'],
    },
    {
      type: 'category',
      label: 'Use the API',
      collapsed: false,
      items: [
        'guides/patient-data',
        'guides/cohort-filtering',
        'guides/grouped-data',
        'guides/distribution',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: true,
      items: ['reference/configuration', 'reference/openapi', 'reference/troubleshooting'],
    },
  ],
};

export default sidebars;
