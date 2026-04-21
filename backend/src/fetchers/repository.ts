// Fetchers for repository data and metrics

import { Organization, Repository } from '@octokit/graphql-schema';
import { Fetcher } from '..';
import { RepositoryResult } from '../../../types';

export const addRepositoriesToResult: Fetcher = async (
  result,
  octokit,
  config,
) => {
  const organization = await octokit.graphql.paginate<{
    organization: Organization;
  }>(
    `
  query ($cursor: String, $organization: String!) {
    organization(login:$organization) {
      repositories(privacy:PUBLIC, first:100, isFork:false, isArchived:false, after: $cursor)
      {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          name
          nameWithOwner
          forkCount
          stargazerCount
          isFork
          isArchived
          hasIssuesEnabled
          hasDiscussionsEnabled
          discussions {
            totalCount
          }
          licenseInfo {
            name
          }
          watchers {
            totalCount
          }
          repositoryTopics(first: 20) {
            nodes {
              topic {
                name
              }
            }
          }
        }
      }
    }
  }
  `,
    {
      organization: config.organization,
    },
  );

  const filteredRepos = organization.organization.repositories.nodes!.filter(
    (repo) =>
      !(repo?.isArchived && !config.includeArchived) ||
      !(repo.isFork && !config.includeForks),
  ) as Repository[];

  return {
    ...result,
    repositories: filteredRepos.reduce(
      (acc, repo) => {
        return {
          ...acc,
          [repo.name]: {
            repositoryName: repo.name,
            repoNameWithOwner: repo.nameWithOwner,
            licenseName: repo.licenseInfo?.name || 'No License',
            topics: repo.repositoryTopics.nodes?.map(
              (node) => node?.topic.name,
            ),
            forksCount: repo.forkCount,
            watchersCount: repo.watchers.totalCount,
            starsCount: repo.stargazerCount,
            issuesEnabled: repo.hasIssuesEnabled,
            projectsEnabled: false,
            discussionsEnabled: repo.hasDiscussionsEnabled,
            collaboratorsCount: 0,
            projectsCount: 0,
            projectsV2Count: 0,
          } as RepositoryResult,
        };
      },
      {} as Record<string, RepositoryResult>,
    ),
  };
};
