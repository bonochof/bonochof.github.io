#!/usr/bin/env ruby
# frozen_string_literal: true

# Build a Japanese academic CV (履歴 + 研究業績) as a print-ready HTML and PDF.
#
# Reads the same `_data/*.yml` the website uses, so the CV stays in sync with
# the site. Renders a self-contained HTML (inline CSS, no external assets) and
# prints it to PDF with headless Google Chrome.
#
# Usage:
#   ruby bin/build_cv.rb            # build HTML + PDF into assets/cv/
#   ruby bin/build_cv.rb --html     # build HTML only (skip Chrome/PDF)
#
# Output:
#   assets/cv/Ryosuke-Takata-CV.pdf   (committed; served by the download button)
#   assets/cv/cv.html                 (intermediate; handy for previewing)

require 'yaml'
require 'time'

ROOT = File.expand_path('..', __dir__)
DATA = File.join(ROOT, '_data')
OUT  = File.join(ROOT, 'assets', 'cv')
LANG = 'ja'

# ---- Edit-me header fields -------------------------------------------------
EMAIL = '' # public email to show in the header (leave '' to hide)
UPDATED = Time.now.strftime('%Y年%-m月')
# ---------------------------------------------------------------------------

def load(rel)
  YAML.load_file(File.join(DATA, rel))
end

PUB = {
  journals:       load('publications/journals.yml'),
  preprints:      load('publications/preprints.yml'),
  conferences:    load('publications/conferences.yml'),
  jaconferences:  load('publications/ja-conferences.yml'),
  misc:           load('publications/misc.yml'),
  invite:         load('publications/invite.yml'),
  dissertations:  load('publications/dissertations.yml'),
  grants:         load('publications/grants.yml'),
  awards:         load('publications/awards.yml'),
  organize:       load('publications/organize.yml')
}
TRANSLATE = load('translate.yml')
ABOUT = {
  academia:    load('about/work-academia.yml'),
  programming: load('about/work-programming.yml'),
  society:     load('about/society.yml'),
  committee:   load('about/committee.yml')
}

AWARDS_BY_KEY = PUB[:awards].each_with_object({}) do |a, h|
  h[a['key']] = a if a['key']
end

# ---- helpers ---------------------------------------------------------------

# Pick the localized value. Accepts a String or a {en:, ja:} Hash.
def loc(val)
  return nil if val.nil?
  return val unless val.is_a?(Hash)
  val[LANG] || val['en'] || val.values.first
end

# Strip HTML tags to plain text (used for ranges/labels that must be inline).
def plain(s)
  return '' if s.nil?
  s.to_s.gsub(/<[^>]+>/, '').gsub(/\s+/, ' ').strip
end

# Join an author list (Array of HTML strings) preserving the bold/underline
# markup the data already applies to the owner's own name.
def authors(val)
  list = val
  list = val[LANG] || val['en'] if val.is_a?(Hash)
  list = [list] if list.is_a?(String)
  (list || []).map { |a| a.to_s.strip }.join('，')
end

# Extract the year (last whitespace token) from a date string like "May. 2024".
def year_of(date)
  plain(date).split(' ').last
end

def t_about(*keys)
  node = TRANSLATE['about']
  keys.each { |k| node = node[k] }
  node.is_a?(Hash) ? (node[LANG] || node['en']) : node
end

def range(d)
  s = d['start']
  e = d['end']
  e ? "#{s}–#{e}" : "#{s}–"
end

def esc(s)
  s.to_s.gsub('&', '&amp;').gsub('<', '&lt;').gsub('>', '&gt;')
end

# ---- section renderers -----------------------------------------------------

def education_rows
  edu = TRANSLATE['about']['education']
  # [start, end, key]
  [[2022, 2025, 'doctor'],
   [2020, 2022, 'graduate'],
   [2018, 2020, 'undergraduate'],
   [2013, 2018, 'kosen']].map do |s, e, k|
    label = edu[k][LANG].gsub(/（首席卒業）/, '')
    %(<tr><td class="yr">#{s}–#{e}</td><td>#{label}</td></tr>)
  end.join("\n")
end

# Generic work table (academia / engineering): name + role(disc)
def work_rows(entries, group)
  entries.map do |d|
    next nil unless d['name-key']
    name = t_about('work', group, d['name-key'])
    role = d['disc-key'] ? t_about('work', group, d['disc-key']) : nil
    role_html = role ? %(<span class="role">#{role}</span>) : ''
    %(<tr><td class="yr">#{range(d)}</td><td>#{name}#{role_html}</td></tr>)
  end.compact.join("\n")
end

def society_rows
  ABOUT[:society].map do |d|
    next nil unless d['name-key']
    name = t_about('society', d['name-key'])
    %(<tr><td class="yr">#{range(d)}</td><td>#{name}</td></tr>)
  end.compact.join("\n")
end

def committee_rows
  ABOUT[:committee].map do |d|
    next nil unless d['name-key']
    name = t_about('committee', d['name-key'])
    role = d['disc-key'] ? t_about('committee', d['disc-key']) : nil
    role_html = role ? %(<span class="role">#{role}</span>) : ''
    %(<tr><td class="yr">#{range(d)}</td><td>#{name}#{role_html}</td></tr>)
  end.compact.join("\n")
end

def venue_line(d)
  inn = d['in'] || {}
  parts = []
  ttl = loc(inn['title'])
  parts << ttl if ttl && !ttl.empty?
  parts << "Vol.&nbsp;#{inn['vol']}" if inn['vol']
  parts << "No.&nbsp;#{inn['numero']}" if inn['numero']
  parts << inn['issue'].to_s if inn['issue']
  parts << "pp.&nbsp;#{inn['pp']}" if inn['pp']
  parts << inn['p-no'].to_s if inn['p-no']
  parts << plain(inn['date']) if inn['date']
  parts.join(', ')
end

def refereed_tag(d)
  return nil if d['refereed'].nil?
  d['refereed'] ? '査読有り' : '査読無し'
end

def present_tag(d)
  return nil unless d.key?('oral-presentation')
  d['oral-presentation'] ? '口頭発表' : 'ポスター発表'
end

def award_tag(d)
  k = d['award-key']
  return nil unless k && AWARDS_BY_KEY[k]
  a = AWARDS_BY_KEY[k]
  name = a['award'][LANG]
  name = name.join('・') if name.is_a?(Array)
  "受賞: #{name}"
end

def doi_link(d)
  return nil unless d['doi']
  d['doi'] # already an <a> element
end

# Render a publication entry (journal / conference style)
def pub_entry(d, n, opts = {})
  title = loc(d['title'])
  meta = []
  meta << refereed_tag(d) unless opts[:no_refereed]
  meta << present_tag(d) unless opts[:no_present]
  meta << award_tag(d)
  note = loc(d['note'])
  meta << plain(note) if note
  meta.compact!
  metahtml = meta.empty? ? '' : %(<span class="tags">#{meta.map { |m| "（#{m}）" }.join}</span>)
  doi = doi_link(d) ? %(<div class="doi">#{doi_link(d)}</div>) : ''
  <<~HTML
    <li><span class="num">#{n}.</span><div class="body">
      <div class="ptitle">#{title}</div>
      <div class="pauth">#{authors(d['author'])}</div>
      <div class="pvenue">#{venue_line(d)} #{metahtml}</div>
      #{doi}
    </div></li>
  HTML
end

def list_block(entries, opts = {})
  items = entries.each_with_index.map { |d, i| pub_entry(d, i + 1, opts) }.join("\n")
  %(<ol class="pubs">\n#{items}\n</ol>)
end

def dissertation_block
  items = PUB[:dissertations].each_with_index.map do |d, i|
    title = d['title']['en-main'] ? d['title']['en'] : loc(d['title'])
    ja = d['title']['ja']
    subtitle = (d['title']['en-main'] && ja) ? %(<div class="psub">#{ja}</div>) : ''
    sup = loc(d['supervisor'])
    venue = venue_line(d)
    supline = sup ? %(<span class="tags">（指導教員: #{sup}）</span>) : ''
    <<~HTML
      <li><span class="num">#{i + 1}.</span><div class="body">
        <div class="ptitle">#{title}</div>#{subtitle}
        <div class="pauth">#{authors(d['author'])}</div>
        <div class="pvenue">#{venue} #{supline}</div>
      </div></li>
    HTML
  end.join("\n")
  %(<ol class="pubs">\n#{items}\n</ol>)
end

def grants_block
  items = PUB[:grants].each_with_index.map do |d, i|
    title = loc(d['title'])
    theme = loc(d['theme'])
    amount = loc(d['amount'])
    role = loc(d['role'])
    tags = []
    tags << role if role
    tags << award_tag(d)
    tags.compact!
    taghtml = tags.empty? ? '' : %(<span class="tags">#{tags.map { |x| "（#{x}）" }.join}</span>)
    themehtml = theme ? %(<div class="psub">「#{theme}」</div>) : ''
    <<~HTML
      <li><span class="num">#{i + 1}.</span><div class="body">
        <div class="ptitle">#{title}</div>#{themehtml}
        <div class="pvenue">#{[amount, plain(d['date'])].compact.join(', ')} #{taghtml}</div>
      </div></li>
    HTML
  end.join("\n")
  %(<ol class="pubs">\n#{items}\n</ol>)
end

def awards_block
  items = PUB[:awards].each_with_index.map do |d, i|
    name = d['award'][LANG]
    name = name.join('・') if name.is_a?(Array)
    org = loc(d['title'])
    <<~HTML
      <li><span class="num">#{i + 1}.</span><div class="body">
        <div class="ptitle">#{name}</div>
        <div class="pvenue">#{org}, #{plain(d['date'])}</div>
      </div></li>
    HTML
  end.join("\n")
  %(<ol class="pubs">\n#{items}\n</ol>)
end

def organize_block
  items = PUB[:organize].each_with_index.map do |d, i|
    <<~HTML
      <li><span class="num">#{i + 1}.</span><div class="body">
        <div class="ptitle">#{loc(d['title'])}</div>
        <div class="pvenue">#{plain(d['date'])}</div>
      </div></li>
    HTML
  end.join("\n")
  %(<ol class="pubs">\n#{items}\n</ol>)
end

def invite_block
  items = PUB[:invite].each_with_index.map do |d, i|
    note = loc(d['note'])
    notehtml = note ? %(<span class="tags">（#{note}）</span>) : ''
    <<~HTML
      <li><span class="num">#{i + 1}.</span><div class="body">
        <div class="ptitle">#{loc(d['title'])}</div>
        <div class="pauth">#{authors(d['author'])}</div>
        <div class="pvenue">#{venue_line(d)} #{notehtml}</div>
      </div></li>
    HTML
  end.join("\n")
  %(<ol class="pubs">\n#{items}\n</ol>)
end

# ---- assemble document -----------------------------------------------------

CONTACT = begin
  links = []
  links << '<a href="https://bonochof.github.io">Web</a>'
  links << '<a href="https://researchmap.jp/bonochof">researchmap</a>'
  links << '<a href="https://scholar.google.co.jp/citations?user=vT30-UUAAAAJ">Google Scholar</a>'
  links << '<a href="https://github.com/bonochof">GitHub</a>'
  links << %(<a href="mailto:#{esc(EMAIL)}">Email</a>) unless EMAIL.empty?
  links.join(' ｜ ')
end

def section(title, body)
  <<~HTML
    <section>
      <h2>#{title}</h2>
      #{body}
    </section>
  HTML
end

def table(rows)
  %(<table class="hist"><tbody>\n#{rows}\n</tbody></table>)
end

# front matter (履歴〜委員歴): kept on page 1, auto-shrunk to fit if it grows
front = +''
front << <<~HTML
  <header class="cv-head">
    <div class="name">高田 亮介 <span class="name-en">Ryosuke&nbsp;Takata</span></div>
    <div class="title">東京大学大学院工学系研究科 特任研究員 ／ 博士（学術）</div>
    <div class="contact">#{CONTACT}</div>
  </header>
HTML
front << section('学歴', table(education_rows))
front << section('職歴（研究・教育）', table(work_rows(ABOUT[:academia], 'academia')))
front << section('職歴（企業・開発）', table(work_rows(ABOUT[:programming], 'programming')))
front << section('所属学会', table(society_rows))
front << section('委員歴', table(committee_rows))

# research achievements (研究業績): starts on page 2 (forced page break)
works = +''
works << %(<h1 class="works">研究業績</h1>\n)
works << section("学術論文（#{PUB[:journals].size}件）", list_block(PUB[:journals], no_present: true))
works << section("国際会議における発表（#{PUB[:conferences].size}件）", list_block(PUB[:conferences]))
works << section("国内学会・シンポジウムにおける発表（#{PUB[:jaconferences].size}件）", list_block(PUB[:jaconferences]))
works << section("その他の発表・解説記事（#{PUB[:misc].size}件）", list_block(PUB[:misc], no_present: true))
works << section("プレプリント（#{PUB[:preprints].size}件）", list_block(PUB[:preprints], no_refereed: true, no_present: true))
works << section("招待講演（#{PUB[:invite].size}件）", invite_block)
works << section("学位論文（#{PUB[:dissertations].size}件）", dissertation_block)
works << section("競争的研究資金（#{PUB[:grants].size}件）", grants_block)
works << section("受賞（#{PUB[:awards].size}件）", awards_block)
works << section("研究会・セッションの企画・運営（#{PUB[:organize].size}件）", organize_block)

CSS = <<~CSS
  @page { size: A4; margin: 16mm 15mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: "Hiragino Mincho ProN", "Yu Mincho", "YuMincho", serif;
    color: #1a1a1a; font-size: 9.4pt; line-height: 1.5; margin: 0;
  }
  a { color: #1a1a1a; text-decoration: none; }
  .cv-head { border-bottom: 2px solid #cd5e3c; padding-bottom: 6px; margin-bottom: 10px; }
  .cv-head .name {
    font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
    font-size: 18pt; font-weight: 700; letter-spacing: .02em;
  }
  .cv-head .name-en { font-size: 11pt; font-weight: 600; color: #555; margin-left: 6px; }
  .cv-head .title { font-size: 10pt; font-weight: 600; margin-top: 3px; }
  .cv-head .contact { font-size: 8.4pt; margin-top: 4px; }
  .cv-head .contact a { color: #b14a2b; text-decoration: underline; }

  section { margin-bottom: 7px; }
  h1.works {
    font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
    font-size: 13pt; color: #cd5e3c; margin: 0 0 8px;
    border-bottom: 2px solid #cd5e3c; padding-bottom: 3px;
    page-break-before: always;
  }
  section h2 {
    font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
    font-size: 10.5pt; color: #b14a2b; font-weight: 700;
    border-left: 4px solid #cd5e3c; padding-left: 7px; margin: 0 0 4px;
    page-break-after: avoid;
  }

  table.hist { width: 100%; border-collapse: collapse; }
  table.hist td { vertical-align: top; padding: 0.6px 0; line-height: 1.4; }
  table.hist td.yr {
    width: 74px; white-space: nowrap; color: #555;
    font-family: "Hiragino Kaku Gothic ProN", sans-serif; font-size: 8.4pt;
    padding-right: 8px; padding-top: 1.5px;
  }
  .role { color: #555; margin-left: .6em; font-size: 8.8pt; }
  table.hist .role::before { content: "— "; color: #aaa; }

  ol.pubs { list-style: none; margin: 0; padding: 0; counter-reset: none; }
  ol.pubs > li { display: flex; gap: 6px; margin-bottom: 5px; page-break-inside: avoid; }
  ol.pubs .num {
    flex: 0 0 auto; min-width: 20px; text-align: right; color: #cd5e3c;
    font-family: "Hiragino Kaku Gothic ProN", sans-serif; font-size: 8.6pt; padding-top: 1px;
  }
  ol.pubs .body { flex: 1 1 auto; }
  .ptitle { font-weight: 600; }
  .psub { color: #555; font-size: 8.8pt; }
  .pauth { font-size: 8.8pt; color: #333; }
  .pauth span[style] { white-space: nowrap; }
  .pvenue { font-size: 8.6pt; color: #444; }
  .tags { color: #777; font-size: 8.2pt; }
  .doi { font-size: 8pt; }
  .doi a { color: #1a1a1a; text-decoration: none; }
CSS

CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# Wrap the front matter in `.fm`. `zoom` shrinks its height to fit one page;
# `width: 100/scale %` cancels zoom's horizontal shrink so it stays full-width.
def page_html(front, works, scale)
  fm_attr = scale < 0.999 ? %( style="zoom:#{scale}; width:#{(100.0 / scale).round(2)}%;") : ''
  <<~HTML
    <!doctype html>
    <html lang="ja">
    <head><meta charset="utf-8"><title>高田 亮介 — CV / 履歴・業績</title>
    <style>#{CSS}</style></head>
    <body>
    <div class="fm"#{fm_attr}>
    #{front}
    </div>
    #{works}
    <script>
      var w = document.querySelector('h1.works');
      if (w) document.documentElement.setAttribute('data-fm', Math.round(w.getBoundingClientRect().top));
    </script>
    </body></html>
  HTML
end

# Measure the rendered height of the front matter (px @96dpi) at the PDF's
# content width (A4 210mm − 15mm×2 = 180mm = 680px) via headless Chrome.
def measure_fm(html_path)
  return nil unless File.executable?(CHROME)
  require 'shellwords'
  out = `#{CHROME.shellescape} --headless=new --disable-gpu --dump-dom --window-size=680,30000 file://#{html_path} 2>/dev/null`
  m = out[/data-fm="(\d+)"/, 1]
  m && m.to_i
end

require 'fileutils'
FileUtils.mkdir_p(OUT)
html_path = File.join(OUT, 'cv.html')

# Auto-fit: keep 履歴〜委員歴 on a single page even as entries are added.
# A4 content height = 297 − 16mm×2 = 265mm ≈ 1001px @96dpi; keep a safety margin.
MAX_FM_PX = 990
scale = 1.0
File.write(html_path, page_html(front, works, scale))
measured = measure_fm(html_path)
if measured && measured > MAX_FM_PX
  scale = (MAX_FM_PX.to_f / measured * 0.985).round(3)
  3.times do
    File.write(html_path, page_html(front, works, scale))
    again = measure_fm(html_path)
    break if again.nil? || again <= MAX_FM_PX
    scale = (scale * 0.97).round(3)
  end
  File.write(html_path, page_html(front, works, scale))
end
warn "wrote #{html_path} (front-matter≈#{measured || '?'}px, page-1 scale=#{scale})"

if ARGV.include?('--html')
  warn 'skipping PDF (--html)'
  exit 0
end

pdf_path = File.join(OUT, 'Ryosuke-Takata-CV.pdf')
unless File.executable?(CHROME)
  warn "Chrome not found at #{CHROME}; HTML written but PDF skipped."
  exit 0
end

cmd = [CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
       "--print-to-pdf=#{pdf_path}", "file://#{html_path}"]
ok = system(*cmd, %i[out err] => File::NULL)
if ok && File.exist?(pdf_path)
  warn "wrote #{pdf_path} (#{File.size(pdf_path)} bytes)"
else
  warn 'PDF generation failed'
  exit 1
end
