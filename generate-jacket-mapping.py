# -*- coding: utf-8 -*-
"""
生成干净的jacketMapping.js
以CSV歌名为准，自动匹配xlsx中的ID
"""
import re
import json
import openpyxl
from unicodedata import normalize as unicode_normalize

# ============================================================
# 配置
# ============================================================
SONGS_JS = 'src/data/songs.js'
XLSX_PATH = r'C:\Users\pdf7083\OneDrive - Takeda\Downloads\Jubeat 乐曲资源\Jubeat 乐曲目录（20250205）.xlsx'
OUTPUT_JS = 'src/data/jacketMapping.js'

# ============================================================
# 硬编码的例外处理 (CSV歌名 -> xlsx ID)
# 用于处理xlsx数据不完整或完全对不上的情况
# ============================================================
MANUAL_MAPPING = {
    # xlsx标题不完整
    '竹取飛翔 ～ Lunatic Princess (Ryu☆Remix)': '60000051',
    # 汉字差异 (ー vs 一, 賭ける vs 賭げる)
    'ネトゲ廃人シュプレヒコール': '11000027',  # ー vs 一
    'ALL MY HEART -この恋に、わたしの全てを賭ける-': '30000040',  # 賭ける vs 賭げる
    # 空格/符号差异
    '僕らの永遠～何度生まれ変わっても、 手を繋ぎたいだけの愛だから～': '40000021',
    'Right on time(Ryu☆ Remix)': '50000198',  # 空格差异
    'Endless Chain ～2人でトリガーをひこう～': '50000232',  # 空格差异
    'Milchstrase': '50000276',  # β vs s
    'neko*neko': '60000082',  # *vs＊
    'Scream out!': '70000051',  # xlsx有额外后缀
    '秘密がーる♡乙女': '70000172',  # 心形符号
    'Lachryma《Re:Queen\u2019M》 (BEMANI SYMPHONY Arr.)': '90000205',  # 弯引号U+2019
    # 省略号差异 (… vs ･･･)
    '遠く遠く離れていても…': '11000139',
    # 感叹号和空格差异
    '闘え! ダダンダーン V': '80000078',
    # 数字逗号差异
    '10,000,000,000': '50000368',
    # 中点符号差异 (・U+30FB vs ･U+FF65)
    'Ha・lle・lu・jah': '50000386',
    # 心形符号差异 (♡ vs ♥) + 空格
    'Love ♡ km': '30000041',
    # xlsx数据错误 (封面是DANCE ALL NIGHT，但xlsx标记为Buluka & Nilo)
    'DANCE ALL NIGHT': '50000277',
}

# ============================================================
# 标准化函数
# ============================================================
def normalize(s):
    """标准化字符串用于匹配"""
    s = s.replace('[2]', '').strip()
    
    # 全角 → 半角
    fullwidth_map = {
        '？': '?', '！': '!', '＠': '@', '＃': '#', '＄': '$',
        '％': '%', '＆': '&', '（': '(', '）': ')', '［': '[',
        '］': ']', '｛': '{', '｝': '}', '：': ':', '；': ';',
        '＂': '"', '＇': "'", '，': ',', '．': '.', '／': '/',
        '～': '~', '－': '-', '＋': '+', '＝': '=', '＿': '_',
        '｜': '|', '＜': '<', '＞': '>',
    }
    for full, half in fullwidth_map.items():
        s = s.replace(full, half)
    
    # 弯引号 → 直引号
    for c in '\u201c\u201d\u201e\u201f':
        s = s.replace(c, '"')
    for c in '\u2018\u2019\u201a\u201b':
        s = s.replace(c, "'")
    
    # 特殊符号标准化
    s = s.replace('♡', '')  # 移除心形
    s = s.replace('♥', '')  # 移除心形
    s = s.replace('☆', '')  # 移除星号
    s = s.replace('★', '')  # 移除星号
    s = s.replace('Ⅱ', 'ii')  # 罗马数字
    s = s.replace('Ⅰ', 'i')
    s = s.replace('Ⅲ', 'iii')
    s = s.replace('・', '')  # 中点
    s = s.replace('·', '')  # 中点
    
    # 去除重音符号 (é → e)
    s = unicode_normalize('NFD', s)
    s = ''.join(c for c in s if ord(c) < 0x300 or ord(c) > 0x36f)
    
    # 空格和连字符标准化
    s = re.sub(r'\s*-\s*', '-', s)  # 连字符前后空格统一去掉
    s = re.sub(r'\s+', ' ', s).strip()
    
    # 转小写
    s = s.lower()
    
    return s

# ============================================================
# 主逻辑
# ============================================================
def main():
    # 1. 从songs.js提取所有唯一歌名
    with open(SONGS_JS, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 改进提取：处理转义单引号
    all_titles = re.findall(r"title: '((?:[^'\\]|\\.)*)'", content)
    # 反转义
    all_titles = [t.replace("\\'", "'") for t in all_titles]
    
    # 去重，保留原始歌名（去掉[2]后缀）
    unique_titles = set()
    for t in all_titles:
        base = t.replace('[2]', '').strip()
        unique_titles.add(base)
    
    print(f'CSV唯一歌名数: {len(unique_titles)}')
    
    # 2. 从xlsx读取ID-歌名映射
    wb = openpyxl.load_workbook(XLSX_PATH)
    ws = wb.active
    xlsx_data = {}  # normalized_title -> (original_title, id)
    for row in list(ws.iter_rows())[1:]:
        if row[0].value and row[2].value:
            orig = str(row[2].value).strip()
            song_id = str(row[0].value)
            norm = normalize(orig)
            xlsx_data[norm] = (orig, song_id)
    
    print(f'xlsx歌曲数: {len(xlsx_data)}')
    
    # 3. 匹配
    final_mapping = {}
    matched = 0
    unmatched = []
    
    for csv_title in sorted(unique_titles):
        # 先检查硬编码
        if csv_title in MANUAL_MAPPING:
            final_mapping[csv_title] = MANUAL_MAPPING[csv_title]
            matched += 1
            continue
        
        csv_norm = normalize(csv_title)
        
        # 精确匹配
        if csv_norm in xlsx_data:
            final_mapping[csv_title] = xlsx_data[csv_norm][1]
            matched += 1
            continue
        
        # 前缀匹配（xlsx标题可能不完整）
        found = False
        for xlsx_norm, (xlsx_orig, xlsx_id) in xlsx_data.items():
            if csv_norm.startswith(xlsx_norm) and len(xlsx_norm) >= 4:
                final_mapping[csv_title] = xlsx_id
                matched += 1
                found = True
                break
        
        if not found:
            unmatched.append(csv_title)
    
    print(f'\n匹配成功: {matched}')
    print(f'未匹配: {len(unmatched)}')
    
    if unmatched:
        print('\n=== 未匹配歌曲 (可添加到MANUAL_MAPPING或确认无封面) ===')
        for t in unmatched[:30]:
            print(f"    '{t}': '',")
    
    # 4. 生成JS文件
    js_content = 'export const titleToId = ' + json.dumps(final_mapping, ensure_ascii=False, indent=2) + ';\n'
    
    with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print(f'\n已生成 {OUTPUT_JS}，共 {len(final_mapping)} 条映射')

if __name__ == '__main__':
    main()
