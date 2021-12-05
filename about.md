---
layout: default
title: About
#permalink: /about/
---

<h3>Education</h3>

|Year      |Education                                                                                           |
|----------|----------------------------------------------------------------------------------------------------|
|2020--    |Department of Informatics, Graduate School of Integrated Science and Technology, Shizuoka University|
|2018--2020|Faculty of Informatics, Shizuoka University                                                         |
|2013--2018|Department of Information Engineering, National Institute of Technology, Matsue College             |


<h3>Activity</h3>

<div class="activity">
  <select id="activity-view-num" onchange="change_table();">
    <option value="10">10</option>
    <option value="256">All</option>
  </select>

  <table id="activity-table"><tbody>
    <tr><th>Date</th><th>Description</th></tr>
    {% for item in site.data.activity %}
      <tr><td>{{ item.date }}</td><td>{{ item.description }}</td></tr>
    {% endfor %}
  </tbody></table>
</div>

<script type="text/javascript" src="{{ '/assets/js/main.js' | relative_url }}">
