/**
 * 清理文本中的特殊标记和格式符，用于 TTS 语音合成
 * @param text 原始文本
 * @returns 清理后的文本
 */
export function cleanTextForSpeech(text: string): string {
  return text
    // 去掉 [IMAGE: ...] 标记
    .replace(/\[IMAGE:\s*.+?\]/g, '')
    // 去掉中文括号及其内容
    .replace(/（[^）]*）/g, '')
    // 去掉英文括号及其内容
    .replace(/\([^)]*\)/g, '')
    // 去掉中括号及其内容
    .replace(/\[[^\]]*\]/g, '')
    // 去掉引号类标点
    .replace(/[「」『』]/g, '')
    // 去掉多余的空格
    .replace(/\s+/g, ' ')
    // 去掉开头和结尾的空白
    .trim();
}

/**
 * 检查清理后的文本是否为空
 * @param text 原始文本
 * @returns 是否可以用于 TTS
 */
export function canUseForTTS(text: string): boolean {
  const cleaned = cleanTextForSpeech(text);
  return cleaned.length > 0;
}
