import { delay } from '@fastgpt/global/common/system/utils';
import { addLog } from '@fastgpt/service/common/system/log';
import { firecrawlApp, SearchOptions, SearchPageOptions } from '../utils';

type Props = {
  query: string;
  pageOptions: SearchPageOptions;
  searchOptions: SearchOptions;
};

// Response type same as HTTP outputs
type Response = Promise<{
  data: any;
}>;

const main = async (props: Props, retry = 3): Response => {
  const { query, pageOptions, searchOptions } = props;
  addLog.debug('search props', props);
  try {
    const result = await firecrawlApp.search(query, {
      pageOptions,
      searchOptions
    });
    addLog.debug('search result', result);
    return {
      data:
        result.data?.map((item) => ({
          markdown: item.markdown,
          metadata: {
            title: item.metadata.title,
            description: item.metadata.description,
            sourceURL: item.metadata.sourceURL,
            pageStatusCode: item.metadata.pageStatusCode
          }
        })) || 'Failed to fetch data'
    };
  } catch (error) {
    if (retry <= 0) {
      addLog.warn('Firecrawl error', { error });
      return {
        data: 'Failed to fetch data'
      };
    }

    await delay(Math.random() * 5000);
    return main(props, retry - 1);
  }
};

export default main;
