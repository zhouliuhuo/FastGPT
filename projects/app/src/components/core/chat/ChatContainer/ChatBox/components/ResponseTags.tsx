import React, { useEffect, useMemo, useState } from 'react';
import { type ChatHistoryItemResType } from '@fastgpt/global/core/chat/type.d';
import { DispatchNodeResponseType } from '@fastgpt/global/core/workflow/runtime/type.d';
import { Flex, useDisclosure, Box, Collapse } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import type { SearchDataResponseItemType } from '@fastgpt/global/core/dataset/type';
import dynamic from 'next/dynamic';
import MyTag from '@fastgpt/web/components/common/Tag/index';
import MyTooltip from '@fastgpt/web/components/common/MyTooltip';
import { FlowNodeTypeEnum } from '@fastgpt/global/core/workflow/node/constant';
import { getSourceNameIcon } from '@fastgpt/global/core/dataset/utils';
import ChatBoxDivider from '@/components/core/chat/Divider';
import { strIsLink } from '@fastgpt/global/common/string/tools';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useSystem } from '@fastgpt/web/hooks/useSystem';
import { useSize } from 'ahooks';
import { useUserStore } from '@/web/support/user/useUserStore';

const QuoteModal = dynamic(() => import('./QuoteModal'));
const ContextModal = dynamic(() => import('./ContextModal'));
const WholeResponseModal = dynamic(() => import('../../../components/WholeResponseModal'));

const isLLMNode = (item: ChatHistoryItemResType) =>
  item.moduleType === FlowNodeTypeEnum.chatNode || item.moduleType === FlowNodeTypeEnum.tools;

const ResponseTags = ({
  flowResponses = [],
  showDetail
}: {
  flowResponses?: ChatHistoryItemResType[];
  showDetail: boolean;
}) => {
  const { userInfo } = useUserStore();
  const { isPc } = useSystem();
  const { t } = useTranslation();
  const quoteListRef = React.useRef<HTMLDivElement>(null);
  const [quoteModalData, setQuoteModalData] = useState<{
    rawSearch: SearchDataResponseItemType[];
    metadata?: {
      collectionId: string;
      sourceId?: string;
      sourceName: string;
    };
  }>();
  const [isOverflow, setIsOverflow] = useState<boolean>(true);
  const [quoteFolded, setQuoteFolded] = useState<boolean>(true);
  const [contextModalData, setContextModalData] =
    useState<DispatchNodeResponseType['historyPreview']>();
  const {
    isOpen: isOpenWholeModal,
    onOpen: onOpenWholeModal,
    onClose: onCloseWholeModal
  } = useDisclosure();

  const quoteListSize = useSize(quoteListRef);
  useEffect(() => {
    setIsOverflow(
      quoteListRef.current ? quoteListRef.current.scrollHeight > (isPc ? 50 : 55) : true
    );
  }, [isOverflow, quoteListSize]);

  const {
    llmModuleAccount,
    quoteList = [],
    sourceList = [],
    historyPreview = [],
    runningTime = 0
  } = useMemo(() => {
    const flatResponse = flowResponses
      .map((item) => {
        if (item.pluginDetail || item.toolDetail) {
          return [item, ...(item.pluginDetail || []), ...(item.toolDetail || [])];
        }
        return item;
      })
      .flat();

    const chatData = flatResponse.find(isLLMNode);
    const quoteList = flatResponse
      .filter((item) => item.moduleType === FlowNodeTypeEnum.datasetSearchNode)
      .map((item) => item.quoteList)
      .flat()
      .filter(Boolean) as SearchDataResponseItemType[];

    const sourceList = quoteList.reduce(
      (acc: Record<string, SearchDataResponseItemType[]>, cur) => {
        if (!acc[cur.collectionId]) {
          acc[cur.collectionId] = [cur];
        }
        return acc;
      },
      {}
    );
    return {
      llmModuleAccount: flatResponse.filter(isLLMNode).length,
      quoteList,
      sourceList: Object.values(sourceList)
        .flat()
        .map((item) => ({
          sourceName: item.sourceName,
          sourceId: item.sourceId,
          icon: getSourceNameIcon({ sourceId: item.sourceId, sourceName: item.sourceName }),
          canReadQuote: showDetail || strIsLink(item.sourceId),
          collectionId: item.collectionId
        })),
      historyPreview: chatData?.historyPreview,
      runningTime: +flowResponses.reduce((sum, item) => sum + (item.runningTime || 0), 0).toFixed(2)
    };
  }, [showDetail, flowResponses]);

  return flowResponses.length === 0 ? null : (
    <>
      {sourceList.length > 0 && (
        <>
          <Flex justifyContent={'space-between'} alignItems={'center'}>
            <Box width={'100%'}>
              <ChatBoxDivider icon="core/chat/quoteFill" text={t('common:core.chat.Quote')} />{' '}
            </Box>
            {quoteFolded && isOverflow && (
              <MyIcon
                _hover={{ color: 'primary.500', cursor: 'pointer' }}
                name="core/chat/chevronDown"
                w={'14px'}
                onClick={() => setQuoteFolded(!quoteFolded)}
              />
            )}
          </Flex>

          <Flex alignItems={'center'} flexWrap={'wrap'} gap={2} position={'relative'}>
            {
              <Collapse
                startingHeight={isPc ? '50px' : '55px'}
                in={(!quoteFolded && isOverflow) || !isOverflow}
              >
                <Flex
                  ref={quoteListRef}
                  alignItems={'center'}
                  position={'relative'}
                  flexWrap={'wrap'}
                  gap={2}
                  height={quoteFolded && isOverflow ? ['55px', '50px'] : 'auto'}
                  overflow={'hidden'}
                  _after={
                    quoteFolded && isOverflow
                      ? {
                          content: '""',
                          position: 'absolute',
                          zIndex: 2,
                          bottom: 0,
                          left: 0,
                          width: '100%',
                          height: '50%',
                          background:
                            'linear-gradient(to bottom, rgba(247,247,247,0), rgba(247, 247, 247, 0.91))',
                          pointerEvents: 'none'
                        }
                      : {}
                  }
                >
                  {sourceList.map((item) => {
                    return (
                      <MyTooltip key={item.collectionId} label={t('core.chat.quote.Read Quote')}>
                        <Flex
                          alignItems={'center'}
                          fontSize={'xs'}
                          border={'sm'}
                          py={1.5}
                          px={2}
                          borderRadius={'sm'}
                          _hover={{
                            '.controller': {
                              display: 'flex'
                            }
                          }}
                          overflow={'hidden'}
                          position={'relative'}
                          cursor={'pointer'}
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuoteModalData({
                              rawSearch: quoteList,
                              metadata: {
                                collectionId: item.collectionId,
                                sourceId: item.sourceId,
                                sourceName: item.sourceName
                              }
                            });
                          }}
                        >
                          <MyIcon name={item.icon as any} mr={1} flexShrink={0} w={'12px'} />
                          <Box className="textEllipsis3" wordBreak={'break-all'} flex={'1 0 0'}>
                            {item.sourceName}
                          </Box>
                        </Flex>
                      </MyTooltip>
                    );
                  })}
                  {isOverflow && !quoteFolded && (
                    <MyIcon
                      position={'absolute'}
                      bottom={0}
                      right={0}
                      _hover={{ color: 'primary.500', cursor: 'pointer' }}
                      name="core/chat/chevronUp"
                      w={'14px'}
                      onClick={() => setQuoteFolded(!quoteFolded)}
                    />
                  )}
                </Flex>
              </Collapse>
            }
          </Flex>
        </>
      )}
      {showDetail && (
        <Flex alignItems={'center'} mt={3} flexWrap={'wrap'} gap={2}>
          {quoteList.length > 0 && (
            <MyTooltip label="查看引用">
              <MyTag
                colorSchema="blue"
                type="borderSolid"
                cursor={'pointer'}
                onClick={() => setQuoteModalData({ rawSearch: quoteList })}
              >
                {quoteList.length}条引用
              </MyTag>
            </MyTooltip>
          )}
          {llmModuleAccount === 1 && (
            <>
              {historyPreview.length > 0 && (
                <MyTooltip label={'点击查看上下文预览'}>
                  <MyTag
                    colorSchema="green"
                    cursor={'pointer'}
                    type="borderSolid"
                    onClick={() => setContextModalData(historyPreview)}
                  >
                    {historyPreview.length}条上下文
                  </MyTag>
                </MyTooltip>
              )}
            </>
          )}
          {llmModuleAccount > 1 && (
            <MyTag type="borderSolid" colorSchema="blue">
              多组 AI 对话
            </MyTag>
          )}

          {isPc && runningTime > 0 && (
            <MyTooltip label={'模块运行时间和'}>
              <MyTag colorSchema="purple" type="borderSolid" cursor={'default'}>
                {runningTime}s
              </MyTag>
            </MyTooltip>
          )}
          {userInfo?.team.permission.hasManagePer && (
            <MyTooltip label={t('common:core.chat.response.Read complete response tips')}>
              <MyTag
                colorSchema="gray"
                type="borderSolid"
                cursor={'pointer'}
                onClick={onOpenWholeModal}
              >
                {t('common:core.chat.response.Read complete response')}
              </MyTag>
            </MyTooltip>
          )}
        </Flex>
      )}
      {!!quoteModalData && (
        <QuoteModal
          {...quoteModalData}
          showDetail={showDetail}
          onClose={() => setQuoteModalData(undefined)}
        />
      )}
      {!!contextModalData && (
        <ContextModal context={contextModalData} onClose={() => setContextModalData(undefined)} />
      )}
      {isOpenWholeModal && (
        <WholeResponseModal
          response={flowResponses}
          showDetail={showDetail}
          onClose={onCloseWholeModal}
        />
      )}
    </>
  );
};

export default React.memo(ResponseTags);
