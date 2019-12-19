/**
 * エラーログ
 */
import { write_error_log } from 'src/util';

/**
 * db
 */
import { Mongodb, t_argument } from 'src/mongodb';

/**
 * logic
 */
import { l_after_second } from 'src/logic/l_after_second';
import { l_upload } from 'src/logic/l_upload';
/**
 * 定数
 */
import { constant } from 'src/constant';

export const a_upload = async (params: {
  socket: SocketIO.Socket;
  jwt_token: string;
  ip: string;
  io: SocketIO.Server;
}) => {
  const _this_url = constant.URL_UPLOAD_FILE;
  const _correct_url = constant.URL_ROOM;

  params.socket.on(_this_url, async (req: { upload: Buffer }) => {
    try {
      const _ret = await l_after_second({
        jwt_token: params.jwt_token,
        ip: params.ip
      });

      if (_ret.url !== _correct_url) {
        params.socket.emit(_this_url, _ret);
        return;
      }

      // ファイルアップロード処理
      await new Mongodb<void>().normalMethod(
        l_upload({
          userId: _ret.userId,
          roomId: _ret.roomId,
          ip: params.ip,
          upload_file: req.upload
        })
      );

      // レスポンス
      params.socket.emit(_this_url, { url: _correct_url });

      // ブロードキャスト
      await new Mongodb<void>().normalMethod(async (argument: t_argument) => {
        const _list = await argument.model.users.aggregate_member_socket({
          roomId: _ret.roomId
        });

        _list.map(m =>
          m.socketId.length !== 0 && m.userId !== _ret.userId
            ? params.io.to(m.socketId[0]).emit(constant.URL_OBSERVER_ROOM, {})
            : ''
        );
      });
    } catch (e) {
      params.socket.disconnect();
      await write_error_log(e);
    }
  });
};
