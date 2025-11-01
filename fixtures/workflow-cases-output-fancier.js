({
  samples: {
    plain_safe: dedent`
  Line one
  Line two
  Line three
  `,
    with_backtick: dedent`
    First line with \`tick\`
    Second line
    `,
    with_dollar: dedent`
      Amount: \$123
      Breakdown: \$45 + \$78
      `,
    with_double_dollar: dedent`
        Literal dollar: \$\$
        Amount: \$\$100
        Multiple: \$\$\$\$200
        `,
    with_backslash: dedent`
          C:\\Program Files\\App
          Next line\\ending
          `,
    mixed_risky: dedent`
            \`Code\` \$var \\path
            Second \${line} here
            `,
    trailing_spaces: dedent`
              Line A  
              Line B   
                Line C    
              `,
    leading_and_blank: dedent`
                
                
                Alpha
                
                Beta
                
                
                Gamma
                
                `,
    emoji_unicode: dedent`
                  Status: ✅
                  Rocket: 🚀
                  Faces: 😀😃😄
                  `,
    crlf_variant: "Line1\r\nLine2\r\nLine3",
    escaped_vs_real: dedent`
                    Real line 1
                    Real line 2\\nEscaped newline sequence literal\\nAnother line
                    `,
    deep_indent_literal: dedent`
                      function someCode() {
                          if (test) {
                              console.log("indented block");
                          }
                      }
                      
                      `,
    deep_indent_folded: dedent`
                        function someCode() {
                            if (test) {
                                console.log("indented block");
                            }
                        }
                        
                        `,
    github_expression_step: dedent`
                          echo "::set-output name=tag::\${GITHUB_REF##*/}" # risky due to \${}
                          echo "Branch is \${GITHUB_REF}"
                          
                          `,
    github_expression_inline: dedent`
                            First \${GITHUB_REF} second \${GITHUB_SHA}
                            Third line
                            `,
    heredoc_script: dedent`
                              cat <<'EOF'
                              line with \$DOLLAR and \`backtick\` and \\ backslash
                              second line
                              EOF
                              
                              `,
    fenced_code_block: dedent`
                                \`\`\`bash
                                echo "Hello \$USER" # inside code fence
                                echo \`date\`
                                \`\`\`
                                
                                `,
    mixed_markup: dedent`
                                  ### Heading Level 3
                                  Paragraph with *italic* and **bold** and \`\$inline\` code.
                                  List:
                                  - Item 1
                                  - Item 2 with \`tick\` and \$amount
                                  
                                  `,
    block_with_trailing_ws: dedent`
                                    line with two spaces  
                                    line with tab	
                                    line with mix
                                    
                                    `,
    folded_ending_blank: dedent`
                                      This is a folded line followed by another
                                      
                                      `,
    literal_start_blank: dedent`
                                        
                                        Indented after blank
                                        Second line
                                        
                                        `,
    looks_like_template: dedent`
                                          \${notActually} plain text
                                          Another line
                                          `,
    json_like: dedent`
                                            {
                                              "name": "Example",
                                              "value": "Some \$value with \`tick\` and \\\\backslash"
                                            }
                                            
                                            `,
    yaml_in_yaml: dedent`
                                              key: value
                                              other: \$money
                                              note: \`inline\`
                                              
                                              `,
    backslash_continuations: dedent`
                                                echo "first line" \\
                                                echo "second line" \\
                                                echo "third line"
                                                
                                                `,
    varying_indent: dedent`
                                                  no indent
                                                    two spaces
                                                      four spaces
                                                        six spaces
                                                  
                                                  `,
    empty_multiline: dedent`
                                                    
                                                    
                                                    
                                                    
                                                    `,
    "stale-pr-message": dedent`
                                                      No PR activity in 30 days.
                                                      
                                                      `,
    run: dedent`
                                                        curl -L \\
                                                        -X POST \\
                                                        -H "Accept: application/vnd.github+json" \\
                                                        -H "Authorization: Bearer \${{ secrets.GHA_PAT }}" \\
                                                        -H "X-GitHub-Api-Version: 2022-11-28" \\
                                                        -d '{"labels":["stale"]}'
                                                        
                                                        `,
    escaped_backticks_code: dedent`
                                                          const commentBody = \`string with ticks in it \\\`git rebase -i\\\`\\nlast line\`\\n    echo "Done"
                                                          
                                                          `,
    script: dedent`
                                                            const body = \`
                                                              Commit: \${process.env.COMMIT_SHA}
                                                              Run: \${github.run_id}
                                                              Tip: use \\\`git rebase -i\\\` to adjust commits.
                                                              Review changes or ignore.
                                                            \`;
                                                            console.log(body);
                                                            
                                                            `,
  },
  meta: { description: "Synthetic cases for classifier evolution", version: 1 },
  messages: {
    simple: "Hello World",
    multiline_plain: dedent`
                                                              Line1
                                                              Line2
                                                              Line3
                                                              `,
    multiline_with_backtick: dedent`
                                                                Here is a \`code\` sample
                                                                Second line
                                                                `,
    multiline_with_dollar: dedent`
                                                                  Total is \$100
                                                                  Breakdown line
                                                                  `,
    multiline_with_backslash: dedent`
                                                                    Path C:\\Program Files\\App
                                                                    Next line
                                                                    `,
    block_literal: dedent`
                                                                      First block line
                                                                      Second block line with \$
                                                                      Third block line with \`backtick\`
                                                                      Fourth line with a backslash \\
                                                                      
                                                                      `,
    block_folded: dedent`
                                                                        Folded text first line second line with backslash \\ third line containing \$ final line with \`tick\`
                                                                        
                                                                        `,
  },
  nested: {
    level1: {
      level2: {
        multiline: dedent`
                                                                          Alpha
                                                                          Beta
                                                                          Gamma with \$ and \` and \\
                                                                          
                                                                          `,
      },
    },
  },
  list_examples: [
    "Single line",
    dedent`
                                                                            Line A
                                                                            Line B
                                                                            `,
    dedent`
                                                                              Block item line 1
                                                                              Block item line 2 with \$
                                                                              Block item line 3 with \\
                                                                              
                                                                              `,
    dedent`
                                                                                Folded item first folded item second with \` folded item third
                                                                                
                                                                                `,
  ],
});
