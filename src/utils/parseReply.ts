// 从 LLM 回复中提取图片标记和纯文本内容

export interface ParsedReply {
  text: string;
  imagePrompt: string | null;
}

/**
 * 解析回复，提取文字部分和图片描述
 * @param reply LLM 的原始回复
 * @returns 解析后的文本和图片描述
 */
export function parseReply(reply: string): ParsedReply {
  // 匹配 [IMAGE: xxx] 格式的标记
  const imageMatch = reply.match(/\[IMAGE:\s*(.+?)\]/);
  
  // 移除图片标记，得到纯文本
  const textContent = reply
    .replace(/\[IMAGE:\s*.+?\]/g, '')
    .replace(/\n{3,}/g, '\n\n') // 移除多余的空行
    .trim();
  
  return {
    text: textContent,
    imagePrompt: imageMatch ? imageMatch[1].trim() : null,
  };
}
