import { Command, flags } from '@oclif/command';
import { harTrace } from 'parse-profile';

export default class CreateArchive extends Command {
  public static description = 'Creates an automated archive file from a URL.';
  public static flags = {
    output: flags.string({
      char: 'o',
      default: './trace.archive',
      description: 'the archive output file name',
      required: true
    }),
    url: flags.string({
      char: 'u',
      description: 'url to visit to produce the archive file',
      required: true
    })
  };

  public async run() {
    const { flags } = this.parse(CreateArchive);
    const { url, output } = flags;

    await harTrace(url, output);
    return this.log(
      `HAR successfully generated from ${url} and available here: ${output}`
    );
  }
}
