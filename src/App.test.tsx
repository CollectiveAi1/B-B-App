import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { templateMessage } from './domain/automatedMessages';
import { AssistantError, type AssistantClient } from './services/assistantClient';
import { demoReply } from './services/demoAssistant';

/** An assistant that answers at once from the demo rules and counts its calls. */
function fakeAssistant(overrides: Partial<AssistantClient> = {}) {
  const client = {
    resolveMode: vi.fn<AssistantClient['resolveMode']>(() => Promise.resolve('demo')),
    reply: vi.fn<AssistantClient['reply']>((request) => Promise.resolve(demoReply(request))),
    scheduledMessage: vi.fn<AssistantClient['scheduledMessage']>((request) =>
      Promise.resolve({
        text: templateMessage(request.kind, request.guestName, request.propertyName),
        origin: 'template',
      }),
    ),
    ...overrides,
  };
  return client;
}

function renderApp(client: AssistantClient = fakeAssistant()) {
  const user = userEvent.setup();
  // StrictMode double-invokes effects, which is what exposed duplicate sends in the old code.
  render(
    <StrictMode>
      <App client={client} />
    </StrictMode>,
  );
  return { user, client };
}

const panel = (name: string | RegExp) => screen.getByRole('region', { name });
const messageFrom = (guest: string) => screen.getByRole('article', { name: guest });
/** A headline stat card. Anchored so "Clear filter: Active stays" does not also match. */
const stat = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}`) });

async function settled() {
  await waitFor(() => expect(screen.queryAllByText('New')).toHaveLength(0));
  await waitFor(() => expect(screen.queryAllByText('Processing')).toHaveLength(0));
}

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

describe('guest messages', () => {
  it('answers every waiting message: replies, repairs, and escalations', async () => {
    const { client } = renderApp();
    await settled();

    expect(within(messageFrom('Alice Johnson')).getByText('Responded')).toBeInTheDocument();
    expect(
      within(messageFrom('Alice Johnson')).getByText(/Check-in is usually after 3 PM/),
    ).toBeInTheDocument();
    expect(within(messageFrom('Bob Williams')).getByText('Escalated to staff')).toBeInTheDocument();
    expect(
      within(messageFrom('Charlie Brown')).getByText('Assigned to Eleanor Spark'),
    ).toBeInTheDocument();
    expect(
      within(messageFrom('Diana Prince')).getByText('Assigned to John Piper'),
    ).toBeInTheDocument();

    expect(client.reply).toHaveBeenCalledTimes(4);
    expect(within(panel('Maintenance tasks')).getAllByRole('listitem')).toHaveLength(2);
    expect(within(panel('Maintenance tasks')).getByText('2 open')).toBeInTheDocument();
    expect(stat('Awaiting reply')).toHaveTextContent('0');
  });

  it('sends each scheduled message exactly once', async () => {
    const { client } = renderApp();
    await settled();

    expect(
      screen.getAllByRole('article', { name: /Pre-arrival message to Alice Johnson/ }),
    ).toHaveLength(1);
    expect(
      screen.getAllByRole('article', { name: /Mid-stay message to Charlie Brown/ }),
    ).toHaveLength(1);
    expect(client.scheduledMessage).toHaveBeenCalledTimes(2);
  });

  it('waits for the assistant mode before sending anything', async () => {
    let finish: (mode: 'demo') => void = () => {};
    const client = fakeAssistant({
      resolveMode: vi.fn(() => new Promise<'demo'>((resolve) => (finish = resolve))),
    });
    renderApp(client);

    expect(screen.getByText('Connecting')).toBeInTheDocument();
    expect(client.reply).not.toHaveBeenCalled();
    expect(screen.getAllByText('New')).toHaveLength(4);

    finish('demo');
    expect(await screen.findByText('Demo responder')).toBeInTheDocument();
    await settled();
  });

  it('shows a failure with its reason and recovers on retry', async () => {
    const reply = vi
      .fn<AssistantClient['reply']>((request) => Promise.resolve(demoReply(request)))
      .mockRejectedValueOnce(new AssistantError('upstream_timeout'));
    const { user } = renderApp(
      fakeAssistant({ reply, resolveMode: () => Promise.resolve('live') }),
    );
    await settled();

    // Messages are answered oldest first, so the first call is Diana's.
    const failed = messageFrom('Diana Prince');
    expect(within(failed).getByText('Failed')).toBeInTheDocument();
    expect(within(failed).getByText('The model took too long to answer.')).toBeInTheDocument();
    expect(stat('Awaiting reply')).toHaveTextContent('1');
    expect(screen.getByText('Live model')).toBeInTheDocument();

    await user.click(within(failed).getByRole('button', { name: 'Try again' }));
    expect(
      await within(messageFrom('Diana Prince')).findByText('Repair task created'),
    ).toBeInTheDocument();
    expect(stat('Awaiting reply')).toHaveTextContent('0');
  });

  it('delivers a new message when the inbox is checked, without touching earlier ones', async () => {
    const { user, client } = renderApp();
    await settled();

    await user.click(screen.getByRole('button', { name: 'Check for new messages' }));
    expect(screen.getByRole('button', { name: 'Checking…' })).toBeDisabled();

    expect(
      await screen.findByRole('article', { name: 'Eva Green' }, { timeout: 4000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(/new message received/);
    await settled();
    expect(client.reply).toHaveBeenCalledTimes(5);
    expect(within(messageFrom('Alice Johnson')).getByText('Responded')).toBeInTheDocument();
  });
});

describe('finding things', () => {
  it('jumps from a repair to the guest message that raised it', async () => {
    const { user } = renderApp();
    await settled();
    await user.click(screen.getByRole('tab', { name: /Reviews/ }));

    const [firstRepair] = within(panel('Maintenance tasks')).getAllByRole('listitem');
    await user.click(within(firstRepair!).getByRole('button', { name: 'View guest message' }));

    expect(screen.getByRole('tab', { name: /Messages/ })).toHaveAttribute('aria-selected', 'true');
    expect(messageFrom('Charlie Brown')).toHaveFocus();
  });

  it('jumps to the same message again when asked twice in a row', async () => {
    const { user } = renderApp();
    await settled();
    const [firstRepair] = within(panel('Maintenance tasks')).getAllByRole('listitem');
    const jump = within(firstRepair!).getByRole('button', { name: 'View guest message' });

    await user.click(jump);
    expect(messageFrom('Charlie Brown')).toHaveFocus();
    await user.click(jump);
    expect(messageFrom('Charlie Brown')).toHaveFocus();
  });

  it('keeps the open workspace when the skip link changes the URL hash', async () => {
    window.history.replaceState(null, '', '/#cleaning');
    renderApp();
    expect(screen.getByRole('tab', { name: /Cleaning/ })).toHaveAttribute('aria-selected', 'true');

    window.location.hash = '#main';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /Cleaning/ })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
    expect(screen.getByRole('region', { name: 'Cleaning schedule' })).toBeInTheDocument();
  });

  it('filters by a stat, shows the filter, and clears it', async () => {
    const { user } = renderApp();
    await settled();

    await user.click(stat('Active stays'));
    expect(stat('Active stays')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('article', { name: 'Alice Johnson' })).not.toBeInTheDocument();
    expect(messageFrom('Charlie Brown')).toBeInTheDocument();
    expect(panel('Active stays')).toHaveTextContent('Night 2 of 3');

    await user.click(screen.getByRole('button', { name: 'Clear filter: Active stays' }));
    expect(stat('Active stays')).toHaveAttribute('aria-pressed', 'false');
    expect(messageFrom('Alice Johnson')).toBeInTheDocument();
    expect(panel('Upcoming check-ins')).toBeInTheDocument();
  });

  it('opens the cleaning workspace from its stat and drops the filter on leaving', async () => {
    const { user } = renderApp();
    await settled();

    await user.click(stat('Pending cleanings'));
    expect(screen.getByRole('tab', { name: /Cleaning/ })).toHaveAttribute('aria-selected', 'true');
    expect(within(panel('Cleaning schedule')).getAllByRole('listitem')).toHaveLength(1);

    await user.click(screen.getByRole('tab', { name: /Messages/ }));
    expect(stat('Pending cleanings')).toHaveAttribute('aria-pressed', 'false');
  });

  it('moves between workspaces with the arrow keys and keeps the choice in the URL', async () => {
    const { user } = renderApp();
    await settled();

    screen.getByRole('tab', { name: /Messages/ }).focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Cleaning/ })).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: /Cleaning/ })).toBeInTheDocument();
    expect(window.location.hash).toBe('#cleaning');

    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: /Reviews/ })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /Messages/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('opens on the workspace named in the URL', () => {
    window.history.replaceState(null, '', '/#reviews');
    renderApp();
    expect(screen.getByRole('tab', { name: /Reviews/ })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('cleaning workspace', () => {
  async function openPenthouseTurnover() {
    window.history.replaceState(null, '', '/#cleaning');
    const view = renderApp();
    await view.user.click(screen.getByRole('button', { name: /The Penthouse.*Bruce Wayne/ }));
    return view;
  }

  it('walks a turnover from pending to complete, requiring photos where asked', async () => {
    const { user } = await openPenthouseTurnover();
    const schedule = panel('Cleaning schedule');
    const checkbox = (name: RegExp) => within(schedule).getByRole('checkbox', { name });

    // Photo-required items cannot be ticked by hand.
    expect(checkbox(/Clean all glass surfaces/)).toBeDisabled();

    await user.click(checkbox(/Wipe down kitchen island/));
    expect(within(schedule).getByText('In progress')).toBeInTheDocument();

    const complete = within(schedule).getByRole('button', { name: 'Mark as complete' });
    expect(complete).toBeDisabled();
    expect(complete).toHaveAccessibleDescription(/Finish the checklist first \(1 of 9 done\)/);

    for (const label of [
      /master bathroom/,
      /guest bathroom/,
      /Strip both beds/,
      /stainless steel/,
      /minibar/,
      /Vacuum/,
    ]) {
      await user.click(checkbox(label));
    }
    const photo = new File(['pixels'], 'windows.jpg', { type: 'image/jpeg' });
    for (const label of [/Add photo.*glass surfaces/, /Add photo.*high-thread-count/]) {
      const button = within(schedule).getByRole('button', { name: label });
      await user.upload(button.nextElementSibling as HTMLInputElement, photo);
    }
    expect(checkbox(/Clean all glass surfaces/)).toBeChecked();
    expect(within(schedule).getAllByRole('img')).toHaveLength(2);

    await user.click(within(schedule).getByRole('button', { name: 'Mark as complete' }));
    expect(within(schedule).getAllByText('Completed')).toHaveLength(3);
    expect(checkbox(/Wipe down kitchen island/)).toBeDisabled();
    expect(stat('Pending cleanings')).toHaveTextContent('0');

    await user.click(within(schedule).getByRole('button', { name: 'Reopen' }));
    expect(checkbox(/Wipe down kitchen island/)).toBeEnabled();
  });

  it('rejects an SVG, which could carry script when opened full size', async () => {
    await openPenthouseTurnover();
    const button = screen.getByRole('button', { name: /Add photo.*glass surfaces/ });
    await userEvent
      .setup({ applyAccept: false })
      .upload(
        button.nextElementSibling as HTMLInputElement,
        new File(['<svg onload="alert(1)"/>'], 'proof.svg', { type: 'image/svg+xml' }),
      );

    expect(screen.getByRole('alert')).toHaveTextContent('Choose a JPEG, PNG, WebP, or HEIC photo.');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('rejects a file that is not an image', async () => {
    await openPenthouseTurnover();
    const button = screen.getByRole('button', { name: /Add photo.*glass surfaces/ });
    // applyAccept:false lets the test hand over a file the picker would have filtered out.
    await userEvent
      .setup({ applyAccept: false })
      .upload(
        button.nextElementSibling as HTMLInputElement,
        new File(['x'], 'notes.pdf', { type: 'application/pdf' }),
      );

    expect(screen.getByRole('alert')).toHaveTextContent('Choose a JPEG, PNG, WebP, or HEIC photo.');
    expect(screen.getByRole('checkbox', { name: /Clean all glass surfaces/ })).not.toBeChecked();
  });

  it('clocks staff in and out', async () => {
    window.history.replaceState(null, '', '/#cleaning');
    const { user } = renderApp();
    const clock = panel('Time clock');

    expect(within(clock).getByText('Nobody is clocked in.')).toBeInTheDocument();
    await user.selectOptions(within(clock).getByLabelText('Staff member'), 'David Chen');
    await user.click(within(clock).getByRole('button', { name: 'Clock in' }));

    expect(within(clock).getByRole('listitem')).toHaveTextContent('David Chen');
    await user.click(within(clock).getByRole('button', { name: 'Clock out' }));
    expect(within(clock).getByText('Nobody is clocked in.')).toBeInTheDocument();
  });

  it('adds a crew note', async () => {
    window.history.replaceState(null, '', '/#cleaning');
    const { user } = renderApp();
    const notes = panel('Notes for crew');

    expect(within(notes).getByRole('button', { name: 'Add note' })).toBeDisabled();
    await user.type(within(notes).getByLabelText('New note'), 'Extra towels for the Penthouse');
    await user.click(within(notes).getByRole('button', { name: 'Add note' }));

    expect(within(notes).getByRole('listitem')).toHaveTextContent('Extra towels for the Penthouse');
    expect(within(notes).getByLabelText('New note')).toHaveValue('');
  });

  it('validates an incident report, then files it and tells the staff channel', async () => {
    window.history.replaceState(null, '', '/#cleaning');
    const { user } = renderApp();
    const incidents = panel('Report an incident');

    await user.click(within(incidents).getByRole('button', { name: 'Submit report' }));
    const description = within(incidents).getByLabelText(/What happened/);
    expect(within(incidents).getByRole('alert')).toHaveTextContent('Describe what happened.');
    expect(description).toHaveFocus();
    expect(description).toBeInvalid();

    // Every property is offered, not only those with a turnover on the schedule.
    await user.selectOptions(within(incidents).getByLabelText('Property'), 'Lakeside Cabin');
    await user.type(description, 'Cracked window in the hallway');
    await user.click(within(incidents).getByRole('button', { name: 'Submit report' }));

    expect(within(incidents).queryByRole('alert')).not.toBeInTheDocument();
    expect(within(incidents).getByRole('listitem')).toHaveTextContent(
      /Cracked window in the hallway.*Lakeside Cabin.*Maria Garcia/,
    );
    expect(panel('Staff channel')).toHaveTextContent(
      'Maria Garcia at Lakeside Cabin: Cracked window',
    );
  });
});

describe('reviews workspace', () => {
  it('validates the form, focuses the first problem, and saves a review', async () => {
    window.history.replaceState(null, '', '/#reviews');
    const { user } = renderApp();
    const reviews = panel('Guest reviews');
    expect(reviews).toHaveTextContent('4.5 average · 2 reviews');

    await user.click(within(reviews).getByRole('button', { name: 'Add a review' }));
    const form = within(reviews).getByRole('form', { name: 'New review' });
    await user.click(within(form).getByRole('button', { name: 'Save review' }));

    expect(within(form).getAllByRole('alert')).toHaveLength(3);
    expect(within(form).getByLabelText(/Guest and stay/)).toHaveFocus();

    await user.selectOptions(
      within(form).getByLabelText(/Guest and stay/),
      'Marcus Lee at Lakeside Cabin',
    );
    await user.click(within(form).getByRole('radio', { name: '4 stars' }));
    await user.type(within(form).getByLabelText(/Comment/), 'Quiet and spotless.');
    expect(within(form).queryByRole('alert')).not.toBeInTheDocument();
    await user.click(within(form).getByRole('button', { name: 'Save review' }));

    expect(reviews).toHaveTextContent('4.3 average · 3 reviews');
    expect(within(reviews).getByText('Quiet and spotless.')).toBeInTheDocument();
    // The only unreviewed stay now has a review, so there is nothing left to add.
    expect(within(reviews).getByRole('button', { name: 'Add a review' })).toBeDisabled();
    expect(
      within(reviews).getByText('Every finished stay already has a review.'),
    ).toBeInTheDocument();
  });

  it('lets the rating be chosen with the keyboard', async () => {
    window.history.replaceState(null, '', '/#reviews');
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: 'Add a review' }));

    screen.getByRole('radio', { name: '1 star' }).focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(screen.getByRole('radio', { name: '3 stars' })).toBeChecked();
  });
});

describe('page structure', () => {
  it('has one h1, labelled landmarks, and a skip link', async () => {
    renderApp();
    await settled();

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Operations' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('marks simulated integrations as simulated', async () => {
    renderApp();
    await settled();
    expect(within(panel('Staff channel')).getByText('Simulated')).toBeInTheDocument();
    expect(within(panel('Management alerts')).getByText('Simulated')).toBeInTheDocument();
    expect(panel('Management alerts')).toHaveTextContent('management@example.com');
  });
});
