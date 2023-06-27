import { ChatCompletionFunctions } from 'https://esm.sh/openai@3.3.0';
import { Database } from '../../db-types.ts';
import { supabaseClient } from '../_shared/supabase-client.ts';

type EpisodeStatistics = Database['public']['Tables']['episode_statistics']['Row'];
type ValidColumns = 'title' | 'publishedAt' | 'guest' | 'episode_number' | 'duration' | 'topics' | 'viewCount' | 'likeCount' | 'commentCount';
type FilterEpisodesParams = {
  column?: ValidColumns;
  filter?: 'includes_text' | 'greater_than' | 'less_than';
  filter_value?: string;
  order_by: ValidColumns;
  order: 'ASC' | 'DESC';
  top: number;
};

const defaultParams: FilterEpisodesParams = {
  order_by: 'publishedAt',
  order: 'DESC',
  top: 10,
};

/**
 * Return a list of episodes filtered and ordered.
 */
export const filterEpisodes = async (params = defaultParams) => {
  const _params = {
    ...defaultParams,
    ...params,
  };
  const { filter } = _params;
  const limit = 10 < _params.top ? 10 : _params.top;
  let query = supabaseClient.from('episode_statistics').select('id,episode_number,guest,publishedAt,duration,topics,viewCount,likeCount,commentCount');
  // Filters
  if (filter) {
    if (filter === 'includes_text') {
      const searchVal = `'${_params.filter_value}'`;
      query = query.textSearch(_params.column || 'title', searchVal);
    } else if (filter === 'greater_than') {
      query = query.gte(_params.column || 'episode', _params.filter_value);
    } else if (filter === 'less_than') {
      query = query.lte(_params.column || 'episode', _params.filter_value);
    }
  }

  // Order results
  query = query.order(_params.order_by || 'publishedAt', { ascending: _params.order === 'ASC' }).limit(limit);

  const { data, error } = await query;

  if (error) {
    console.error(error);
    console.error('[ERROR] Query with Params: ', JSON.stringify(params));
    return [];
  }
  return data;
};

export const filterEpisodesFn: ChatCompletionFunctions = {
  name: 'query_episodes',
  description: `Use this function to query episodes table, filter and order the results. Valid column names are 'title','publishedAt','guest','episode_number','duration','topics','viewCount','likeCount','commentCount'`,
  parameters: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        description: `Filter operation. Valid operations are 'includes_text', 'greater_than', 'less_than'`,
      },
      column: {
        type: 'string',
        description: `Column name. Use it along with a filter operation`,
      },
      filter_value: {
        type: 'string',
        description: `Filter value. Use it along with a filter operation`,
      },
      order_by: {
        type: 'string',
        description: `Column name used for ordering the results`,
      },
      order: {
        type: 'string',
        description: `Order direction. Valid options are 'ASC', 'DESC'`,
      },
      top: {
        type: 'number',
        description: `Limit the number of results`,
      },
    },
    required: ['order_by']
  }
};

/**
 * UTILS
 */
export const getEpisodeLinks = (list: Partial<EpisodeStatistics>[]) => {
  return list.map((ep) => `https://www.youtube.com/watch?v=${ep.id}`);
};


