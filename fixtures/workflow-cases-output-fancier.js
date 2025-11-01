({
  samples: {
    plain_safe:  dedent`
      Line one
      Line two
      Line three
    `,
    with_backtick: "First line with `tick`\nSecond line",
    with_dollar: "Amount: $123\nBreakdown: $45 + $78",
    with_double_dollar: "Literal dollar: $$\nAmount: $$100\nMultiple: $$$$200",
    with_backslash: "C:\\Program Files\\App\nNext line\\ending",
    mixed_risky: "`Code` $var \\path\nSecond ${line} here",
    trailing_spaces:  dedent`
      Line A  
      Line B   
        Line C    
    `,
    leading_and_blank:  dedent`
      
      
      Alpha
      
      Beta
      
      
      Gamma
      
    `,
    emoji_unicode:  dedent`
      Status: ✅
      Rocket: 🚀
      Faces: 😀😃😄
    `,
    crlf_variant:  dedent`
      Line1
      Line2
      Line3
    `,
    escaped_vs_real:
      "Real line 1\nReal line 2\\nEscaped newline sequence literal\\nAnother line",
    deep_indent_literal:  dedent`
      function someCode() {
          if (test) {
              console.log("indented block");
          }
      }
      
    `,
    deep_indent_folded:  dedent`
      function someCode() {
          if (test) {
              console.log("indented block");
          }
      }
      
    `,
    github_expression_step:
      'echo "::set-output name=tag::${GITHUB_REF##*/}" # risky due to ${}\necho "Branch is ${GITHUB_REF}"\n',
    github_expression_inline:
      "First ${GITHUB_REF} second ${GITHUB_SHA}\nThird line",
    heredoc_script:
      "cat <<'EOF'\nline with $DOLLAR and `backtick` and \\ backslash\nsecond line\nEOF\n",
    fenced_code_block:
      '```bash\necho "Hello $USER" # inside code fence\necho `date`\n```\n',
    mixed_markup:
      "### Heading Level 3\nParagraph with *italic* and **bold** and `$inline` code.\nList:\n- Item 1\n- Item 2 with `tick` and $amount\n",
    block_with_trailing_ws:  dedent`
      line with two spaces  
      line with tab	
      line with mix
      
    `,
    folded_ending_blank:  dedent`
      This is a folded line followed by another
      
    `,
    literal_start_blank:  dedent`
      
      Indented after blank
      Second line
      
    `,
    looks_like_template: "${notActually} plain text\nAnother line",
    json_like:
      '{\n  "name": "Example",\n  "value": "Some $value with `tick` and \\\\backslash"\n}\n',
    yaml_in_yaml: "key: value\nother: $money\nnote: `inline`\n",
    backslash_continuations:
      'echo "first line" \\\necho "second line" \\\necho "third line"\n',
    varying_indent:  dedent`
      no indent
        two spaces
          four spaces
            six spaces
      
    `,
    empty_multiline:  dedent`
      
      
      
      
    `,
    "stale-pr-message":  dedent`
      No PR activity in 30 days.
      
    `,
    run: 'curl -L \\\n-X POST \\\n-H "Accept: application/vnd.github+json" \\\n-H "Authorization: Bearer ${{ secrets.GHA_PAT }}" \\\n-H "X-GitHub-Api-Version: 2022-11-28" \\\n-d \'{"labels":["stale"]}\'\n',
    escaped_backticks_code:
      'const commentBody = `string with ticks in it \\`git rebase -i\\`\\nlast line`\\n    echo "Done"\n',
    script:
      "const body = `\n  Commit: ${process.env.COMMIT_SHA}\n  Run: ${github.run_id}\n  Tip: use \\`git rebase -i\\` to adjust commits.\n  Review changes or ignore.\n`;\nconsole.log(body);\n",
  },
  meta: { description: "Synthetic cases for classifier evolution", version: 1 },
  messages: {
    simple: "Hello World",
    multiline_plain:  dedent`
      Line1
      Line2
      Line3
    `,
    multiline_with_backtick: "Here is a `code` sample\nSecond line",
    multiline_with_dollar: "Total is $100\nBreakdown line",
    multiline_with_backslash: "Path C:\\Program Files\\App\nNext line",
    block_literal:
      "First block line\nSecond block line with $\nThird block line with `backtick`\nFourth line with a backslash \\\n",
    block_folded:
      "Folded text first line second line with backslash \\ third line containing $ final line with `tick`\n",
  },
  nested: {
    level1: {
      level2: { multiline: "Alpha\nBeta\nGamma with $ and ` and \\\n" },
    },
  },
  list_examples: [
    "Single line",
     dedent`
      Line A
      Line B
    `,
    "Block item line 1\nBlock item line 2 with $\nBlock item line 3 with \\\n",
    "Folded item first folded item second with ` folded item third\n",
  ],
});
