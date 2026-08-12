<script lang="ts">
  import {
    EXPLORATORY_BANNER_LABEL,
    EXPLORATORY_BANNER_MESSAGE,
    type ExploratoryPublicationResult
  } from './exploratoryPublication';

  let {
    result,
    feedbackUrl = ''
  }: {
    result: ExploratoryPublicationResult;
    feedbackUrl?: string;
  } = $props();
</script>

{#if result.state !== 'not-exploratory'}
  <aside
    class:invalid={result.state === 'invalid'}
    class="exploratory-banner"
    aria-label="Exploratory publication notice"
    role={result.state === 'invalid' ? 'alert' : 'note'}
    data-publication-state="exploratory"
    data-exploratory-contract={result.state}
    data-release-approved="false"
  >
    <strong class="exploratory-label">{EXPLORATORY_BANNER_LABEL}</strong>
    <div class="exploratory-content">
      <p>{result.state === 'valid' ? EXPLORATORY_BANNER_MESSAGE : result.warning}</p>
      {#if result.state === 'valid' && feedbackUrl}
        <a href={feedbackUrl} rel="nofollow">Give feedback about this exact view</a>
      {/if}
      {#if result.state === 'valid'}
        <details>
          <summary>Review boundaries</summary>
          <dl>
            <div><dt>Snapshot</dt><dd><code>{result.publication.snapshotId}</code></dd></div>
            <div>
              <dt>Publisher</dt>
              <dd>
                {#if result.publication.publisher.url}
                  <a href={result.publication.publisher.url} target="_blank" rel="noopener noreferrer">{result.publication.publisher.name}</a>
                {:else}
                  {result.publication.publisher.name}
                {/if}
                — {result.publication.publisher.authorityStatus.replaceAll('-', ' ')}
              </dd>
            </div>
            <div><dt>Limitations</dt><dd>{result.publication.limitations.join(' ')}</dd></div>
            <div><dt>Do not claim</dt><dd>{result.publication.prohibitedClaims.join(' ')}</dd></div>
            <div><dt>Promotion</dt><dd>{result.publication.promotionRule}</dd></div>
          </dl>
        </details>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .exploratory-banner {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    align-items: flex-start;
    min-width: 0;
    padding: 9px 14px;
    border-bottom: 1px solid #b1a14c;
    background: #fff7bf;
    color: #17202a;
  }

  .exploratory-banner.invalid {
    border-color: #b85c49;
    background: #fbe9e7;
  }

  .exploratory-label {
    flex: 0 0 auto;
    padding: 2px 7px;
    background: #505a5f;
    color: #fff;
    font-size: 12px;
    letter-spacing: .04em;
    line-height: 1.5;
    text-transform: uppercase;
  }

  .invalid .exploratory-label {
    background: #7a1d10;
  }

  .exploratory-content {
    flex: 1 1 36rem;
    min-width: 0;
  }

  p {
    display: inline;
    margin: 0;
  }

  a {
    display: inline;
    margin-left: .35em;
    font-weight: 700;
    overflow-wrap: anywhere;
  }

  details {
    margin-top: 5px;
  }

  summary {
    width: fit-content;
    cursor: pointer;
    font-weight: 700;
  }

  dl {
    display: grid;
    gap: 4px;
    margin: 7px 0 0;
  }

  dl div {
    display: grid;
    grid-template-columns: minmax(7rem, auto) minmax(0, 1fr);
    gap: 8px;
  }

  dt {
    font-weight: 700;
  }

  dd {
    min-width: 0;
    margin: 0;
    overflow-wrap: anywhere;
  }

  @media (max-width: 620px) {
    .exploratory-banner {
      display: block;
    }

    .exploratory-content {
      margin-top: 7px;
    }

    dl div {
      display: block;
    }
  }
</style>
