function Message() {
	this._evtObjs = {};
	this._outdatedMsgs = {};
}
Message.prototype.on = function (evtType, handler, _once) {
	if (!this._evtObjs[evtType]) {
		this._evtObjs[evtType] = [];
	}
	this._evtObjs[evtType].push({
		handler: handler,
		once: _once
	})
	var that = this
	return function () {
		that.off(evtType, handler)
	}
}
Message.prototype.wait = function (evtType, handler) {
	if (this._outdatedMsgs[evtType]) {
		handler.apply(null, this._outdatedMsgs[evtType])
		return noop
	} else {
		// call once
		return this.on(evtType, handler, true)
	}
}
Message.prototype.off = function (evtType, handler) {
	var that = this
	var types;
	if (evtType) {
		types = [evtType];
	} else {
		types = Object.keys(this._evtObjs)
	}
	types.forEach(function (type) {
		if (!handler) {
			// remove all
			that._evtObjs[type] = [];
		} else {
			var handlers = that._evtObjs[type] || [],
				nextHandlers = [];

			handlers.forEach(function (evtObj) {
				if (evtObj.handler !== handler) {
					nextHandlers.push(evtObj)
				}
			})
			that._evtObjs[type] = nextHandlers;
		}
	})

	return this;
}
Message.prototype.emit = function (evtType) {
	var args = Array.prototype.slice.call(arguments, 1)

	this._outdatedMsgs[evtType] = args
	var handlers = this._evtObjs[evtType] || [];
	handlers.forEach(function (evtObj) {
		if (evtObj.once && evtObj.called) return
		evtObj.called = true
		try {
			evtObj.handler && evtObj.handler.apply(null, args);
		} catch (e) {
			console.error(e.stack || e.message || e)
		}
	})
}
Message.prototype.emitAsync = function () {
	var args = arguments
	var ctx = this
	setTimeout(function () {
		ctx.emit.apply(ctx, args)
	}, 0)
}
Message.prototype.assign = function (target) {
	var msg = this;
	['on', 'off', 'wait', 'emit', 'emitAsync'].forEach(function (name) {
		var method = msg[name]
		target[name] = function () {
			return method.apply(msg, arguments)
		}
	})
}
function noop() {
}
/**
 *  Global Message Central
 **/
; (new Message()).assign(Message)

class SelfPromise {
	// state = 'pending';
	// success = noop;
	// fail = noop;
	// message = new Message();
	static resolved(data) {
		return new SelfPromise(resolve => {
			resolve(data)
		})
	}
	constructor(task) {
		this.state = 'pending';
		this.success = noop;
		this.fail = noop;
		this.message = new Message();
		let that = this
		this.message.on('resolved', function () {
			// console.log('step0 resolved', arguments)
			let succRet = that.success.apply(that, [].slice.call(arguments, 0))
			that.commonResolve('nextResolved', succRet)
		})
		this.message.on('rejected', function () {
			// console.log('step0 rejected', that.fail == noop)
			let failRet = arguments[0]
			if (that.fail != noop) {
				that.isTriggerFailed = true
				failRet = that.fail.apply(that, [].slice.call(arguments, 0))
			}
			that.commonResolve('nextRejected', failRet)
		})
		task(this.resolve.bind(this), this.reject.bind(this))
	}
	/**
	 * 触发下一个promise的执行者
	 * @param {*} type 
	 * @param {*} ret 
	 */
	commonResolve(type, ret) {
		if (ret instanceof SelfPromise) {
			ret.then(data => {
				this.message.emit(type, data)
			}, err => {
				this.message.emit('nextRejected', err)
			})
		} else {
			// console.log("step1")
			this.message.emit(this.isTriggerFailed ? 'nextResolved' : type, ret)
		}
	}
	resolve() {
		this.state = 'resolved'
		this.laterTriggerSuccess = () => {
			this.message.emit.apply(this.message, ['resolved', ...[].slice.call(arguments, 0)])
		}
		if (this.successCallbackReady) {
			this.laterTriggerSuccess()
		}
	}
	reject() {
		this.state = 'rejected'
		this.laterTriggerFail = () => {
			this.message.emit.apply(this.message, ['rejected', ...[].slice.call(arguments, 0)])
		}
		if (this.failCallbackReady) {
			this.laterTriggerFail()
		}
		return
	}
	/**
	 * then函数用来给当前promise实例添加成功和失败回调，并且返回下一个promise实例
	 * 为了达到连续触发的效果，返回的下一个promise实例需要订阅当前promise发出的成功和失败回调执行完成的消息
	 * 以便根据当前promise决定下一个promise是reject还是resolve
	 * @param {*} success 
	 * @param {*} fail 
	 */
	then(success, fail) {
		this.success = success ? success : this.success
		this.successCallbackReady = true
		this.fail = fail ? fail : this.fail
		this.failCallbackReady = true
		let next = new SelfPromise((resolve, reject) => {
			this.message.on('nextResolved', function () {
				resolve.apply(null, [].slice.call(arguments, 0))
			})
			this.message.on('nextRejected', function () {
				reject.apply(null, [].slice.call(arguments, 0))
			})
			this.successCallbackReady && this.laterTriggerSuccess && this.laterTriggerSuccess()
			this.failCallbackReady && this.laterTriggerFail && this.laterTriggerFail()
		})
		return next
	}
	/**
	 * then的语法糖，哈哈哈哈
	 * @param {*} callback 
	 */
	catch(callback) {
		return this.then(null, callback)
	}
}


// 测试代码
// var reResolve
// new SelfPromise(resolve => {
// 	reResolve = resolve
// 	setTimeout(() => {
// 		resolve(123)
// 	}, 0)
// }).then(data => {
// 	console.log("then1", data)
// 	return new SelfPromise((resolve, reject) => {
// 		reject(456)
// 	})
// }).then(data1 => {
// 	console.log("then2", data1)
// }).catch(errr => {
// 	console.log("catch3", errr)
// 	return 23
// }).then(data1 => {
// 	console.log("then2", data1)
// })

// reResolve(4444444)

module.exports = SelfPromise


