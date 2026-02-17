
# Get Jira Ticket

Get a Jira work item by its issue key (e.g., `ES-1234`) using `acli`.

## Workflow

1. **Validate the issue key**
   - Expect `PROJECTKEY-123` format (example: `ES-10206`).

2. **Fetch the ticket**
   - Prefer `acli jira workitem view <KEY>`.
   - Use a small field set unless the user asks for “all fields”.

3. **Return what the user needs**
   - For chat-friendly output: key + summary + status + assignee + priority.
   - For programmatic use or further automation: JSON.

## Commands

### Quick view (human readable)

```bash
acli jira workitem view ES-1234 --fields "key,summary,status,priority,assignee,updated"
```

### Full view (all fields)

```bash
acli jira workitem view ES-1234 --fields "*all"
```

### JSON output

```bash
acli jira workitem view ES-1234 --fields "key,summary,status,priority,assignee,description" --json
```

## Bundled script

Use the bundled script when you want consistent defaults + key validation.

```bash
core/skills/get-jira-ticket/scripts/get_ticket.sh ES-1234
```

JSON mode:

```bash
JSON=1 core/skills/get-jira-ticket/scripts/get_ticket.sh ES-1234
```

Override fields:

```bash
FIELDS="key,summary,status,assignee" core/skills/get-jira-ticket/scripts/get_ticket.sh ES-1234
```
