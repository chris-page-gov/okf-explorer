# Optional Git filter — example, not installed

Prefer CI integrity checks. A filter can hide changes if it silently rewrites evidence.
This example only passes text through or rejects it; it does not guess source mappings.
Scope it narrowly to generated report files, not the whole repository.

Example `.gitattributes` entry:

```
research-output/generated/*.md filter=bep-citation-check
```

After reviewing the script and making its path correct for your repository, configure
only that repository:

```sh
git config --local filter.bep-citation-check.clean 'python scripts/git_clean_check.py'
git config --local filter.bep-citation-check.smudge cat
git config --local filter.bep-citation-check.required true
```

No Git configuration was changed during this reconstruction.
