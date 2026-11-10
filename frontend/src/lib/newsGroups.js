// 计算两个字符串的相似度
const calculateSimilarity = (str1, str2) => {
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1.0;

  // 简化版：检查较短字符串是否包含在较长字符串中
  const [shorter, longer] = len1 < len2 ? [str1, str2] : [str2, str1];
  if (longer.includes(shorter)) return 0.85;

  // 检查核心关键词匹配（去除数字后比较）
  const clean1 = str1.replace(/\d+/g, '').trim();
  const clean2 = str2.replace(/\d+/g, '').trim();
  if (clean1 === clean2 && clean1.length > 5) return 0.9;

  // 计算共同字符比例
  const set1 = new Set(str1);
  const set2 = new Set(str2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
};

// 将相似的新闻项分组
export const groupSimilarItems = (items) => {
  const grouped = [];
  const used = new Set();

  items.forEach((item, index) => {
    if (used.has(index)) return;

    const group = {
      mainItem: item,
      duplicates: []
    };

    // 查找相似的项
    items.forEach((otherItem, otherIndex) => {
      if (otherIndex <= index || used.has(otherIndex)) return;

      const similarity = calculateSimilarity(item.title, otherItem.title);
      if (similarity > 0.75) { // 相似度阈值 75%
        group.duplicates.push(otherItem);
        used.add(otherIndex);
      }
    });

    grouped.push(group);
    used.add(index);
  });

  return grouped;
};
